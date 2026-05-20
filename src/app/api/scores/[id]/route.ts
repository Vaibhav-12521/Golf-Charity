import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionActive } from "@/lib/types";
import { z } from "zod";

const Body = z.object({
  value: z.number().int().min(1).max(45),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * PRD §03 / §10 — "enter / edit golf scores".
 * In-place update of a single score belonging to the signed-in user.
 * RLS additionally enforces user_id == auth.uid().
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // PRD §04 — restricted access for non-subscribers.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!isSubscriptionActive(sub)) {
    return NextResponse.json(
      { error: "An active subscription is required to edit scores." },
      { status: 402 },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { error } = await supabase
    .from("scores")
    .update({ value: parsed.data.value, played_on: parsed.data.played_on })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false });

  return NextResponse.json({ scores: scores || [] });
}
