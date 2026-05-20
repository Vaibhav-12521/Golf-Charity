import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({
  value: z.number().int().min(1).max(45),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function listScores(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: false });
  return data || [];
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("scores").insert({
    user_id: params.id,
    value: parsed.data.value,
    played_on: parsed.data.played_on,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scores: await listScores(params.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("scores").delete().eq("id", id).eq("user_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scores: await listScores(params.id) });
}
