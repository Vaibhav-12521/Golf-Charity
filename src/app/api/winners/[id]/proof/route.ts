import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({ path: z.string().min(3).max(300) });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const path = parsed.data.path;

  // 1) Path must live under the user's own folder. Defence-in-depth on top of storage RLS.
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  // 2) Verify the uploaded object's actual mime + size via service-role (storage list
  //    is the only way to read object metadata server-side).
  const admin = createAdminClient();
  const dir = path.substring(0, path.lastIndexOf("/"));
  const file = path.substring(path.lastIndexOf("/") + 1);
  const { data: list, error: listErr } = await admin
    .storage
    .from("winner-proofs")
    .list(dir, { search: file, limit: 1 });

  if (listErr || !list?.length) {
    return NextResponse.json({ error: "Upload not found in storage." }, { status: 404 });
  }

  const meta = (list[0].metadata || {}) as { mimetype?: string; size?: number };
  const mime = meta.mimetype || "";
  const size = meta.size ?? 0;

  if (!ALLOWED_MIME.includes(mime)) {
    await admin.storage.from("winner-proofs").remove([path]);
    return NextResponse.json(
      { error: "Only JPEG / PNG / GIF / WebP images are allowed." },
      { status: 415 },
    );
  }
  if (size > MAX_BYTES) {
    await admin.storage.from("winner-proofs").remove([path]);
    return NextResponse.json({ error: "Max file size is 5MB." }, { status: 413 });
  }

  // 3) Persist the path + advance status. RLS (post-migration) ensures status can
  //    only move to 'pending_review' from 'pending_proof' or 'pending_review'.
  const { error } = await supabase
    .from("winners")
    .update({
      proof_url: path,
      status: "pending_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
