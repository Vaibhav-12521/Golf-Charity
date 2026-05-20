import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emails } from "@/lib/email";

/**
 * Fires the welcome email for the currently signed-in user.
 * Called once from the signup flow after auth succeeds. Idempotent on the
 * caller side; this route does not gate against double-sends because Resend
 * is the cheap path and the route is gated by auth anyway.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  await emails.welcome(user.email, profile?.full_name || "");
  return NextResponse.json({ ok: true });
}
