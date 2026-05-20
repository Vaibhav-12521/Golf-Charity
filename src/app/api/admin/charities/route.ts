import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  hero_url: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  country: z.string().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const slug = parsed.data.slug || slugify(parsed.data.name);
  const { data, error } = await admin
    .from("charities")
    .insert({ ...parsed.data, slug })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
