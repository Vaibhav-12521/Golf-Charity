import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({
  period_year: z.number().int(),
  period_month: z.number().int().min(1).max(12),
  logic: z.enum(["random", "algorithmic"]).default("random"),
});

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  // Roll-in from prior month's unclaimed jackpot.
  const prior = await admin
    .from("draws")
    .select("id, rollover_out_cents")
    .eq("status", "published")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await admin
    .from("draws")
    .insert({
      period_year: parsed.data.period_year,
      period_month: parsed.data.period_month,
      logic: parsed.data.logic,
      rollover_in_cents: prior.data?.rollover_out_cents || 0,
      rollover_from_draw_id: prior.data?.id || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: created.id });
}
