import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({
  action: z.enum(["approve", "reject", "mark_paid", "note"]),
  admin_notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    admin_notes: parsed.data.admin_notes,
    updated_at: new Date().toISOString(),
  };
  switch (parsed.data.action) {
    case "approve": patch.status = "approved"; break;
    case "reject": patch.status = "rejected"; break;
    case "mark_paid": patch.status = "paid"; patch.paid_at = new Date().toISOString(); break;
    case "note": break;
  }

  const { error } = await admin.from("winners").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
