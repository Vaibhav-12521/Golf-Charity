import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionActive } from "@/lib/types";
import { z } from "zod";

const Body = z.object({
  value: z.number().int().min(1).max(45),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function listLatest(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: false });
  return data || [];
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // PRD §04 — non-subscribers receive restricted access.
  // Score entry is a subscriber feature; block at the API boundary.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!isSubscriptionActive(sub)) {
    return NextResponse.json(
      { error: "An active subscription is required to log scores." },
      { status: 402 }, // 402 Payment Required
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { error } = await supabase.from("scores").insert({
    user_id: user.id,
    value: parsed.data.value,
    played_on: parsed.data.played_on,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Trigger has already pruned to 5 — return the fresh list.
  const scores = await listLatest(user.id);
  return NextResponse.json({ scores });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("scores").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const scores = await listLatest(user.id);
  return NextResponse.json({ scores });
}
