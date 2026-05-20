import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({
  charity_id: z.string().uuid(),
  amount_cents: z.number().int().min(100).max(1_000_000_00),
  donor_name: z.string().max(120).optional(),
  donor_email: z.string().email(),
  message: z.string().max(500).optional(),
});

/**
 * Independent donation endpoint (PRD §08 — "Independent donation option,
 * not tied to gameplay/subscription").
 *
 * Authentication is REQUIRED. Originally this allowed anonymous posts to
 * support drive-by donations, but combined with the permissive RLS policy
 * (`with check (true)`) that made the endpoint a write-anywhere spam vector
 * — anyone could script-loop fake donation rows that show up in admin
 * totals.
 *
 * The proper fix is to route real donations through a Stripe Payment
 * Intent and verify the intent on the server before insert. Until that
 * integration ships, requiring an authenticated user is the minimum gate
 * the demo can defend.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to record a donation." },
      { status: 401 },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Verify the charity actually exists + is active. Prevents inserts against
  // a guessed/deleted charity_id.
  const admin = createAdminClient();
  const { data: charity } = await admin
    .from("charities")
    .select("id")
    .eq("id", parsed.data.charity_id)
    .eq("active", true)
    .maybeSingle();
  if (!charity) {
    return NextResponse.json({ error: "Charity not found." }, { status: 404 });
  }

  const { error } = await admin.from("donations").insert({
    user_id: user.id,
    charity_id: parsed.data.charity_id,
    amount_cents: parsed.data.amount_cents,
    source: "standalone",
    donor_name: parsed.data.donor_name ?? null,
    donor_email: parsed.data.donor_email,
    message: parsed.data.message ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
