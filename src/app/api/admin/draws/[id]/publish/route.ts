import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { publishDraw } from "@/lib/draw-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { emails } from "@/lib/email";
import { monthLabel } from "@/lib/utils";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  try {
    const stats = await publishDraw(params.id);

    // Fire-and-forget winner notifications.
    const admin = createAdminClient();
    const { data: draw } = await admin
      .from("draws")
      .select("period_year, period_month")
      .eq("id", params.id)
      .maybeSingle();
    const { data: winners } = await admin
      .from("winners")
      .select("prize_cents, profiles:user_id(email, full_name)")
      .eq("draw_id", params.id);

    if (draw && winners) {
      const label = monthLabel(draw.period_year, draw.period_month);
      await Promise.allSettled(
        winners.map((w) => {
          const p = w.profiles as unknown as { email: string; full_name: string | null } | null;
          if (!p?.email) return;
          return emails.winnerNotice(
            p.email,
            p.full_name || "",
            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(w.prize_cents / 100),
          );
        }),
      );
      // notify all subscribers — keep it tight: only those who entered.
      const { data: entries } = await admin
        .from("draw_entries")
        .select("profiles:user_id(email, full_name)")
        .eq("draw_id", params.id);
      await Promise.allSettled(
        (entries || []).map((e) => {
          const p = e.profiles as unknown as { email: string; full_name: string | null } | null;
          if (!p?.email) return;
          return emails.drawPublished(p.email, p.full_name || "", label);
        }),
      );
    }

    return NextResponse.json(stats);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
