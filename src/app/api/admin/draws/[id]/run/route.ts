import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runDraw } from "@/lib/draw-runner";
import { z } from "zod";

const Body = z.object({ logic: z.enum(["random", "algorithmic"]).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  try {
    const result = await runDraw({
      drawId: params.id,
      logic: parsed.success ? parsed.data.logic : undefined,
      simulate: false,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
