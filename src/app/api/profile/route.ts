import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  full_name: z.string().min(1).max(120).optional(),
  charity_id: z.string().uuid().optional(),
  charity_percent: z.number().min(10).max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  // Auto-promote admin emails. Done via service-role client to bypass RLS.
  if (isAdminEmail(user.email!)) patch.role = "admin";

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
