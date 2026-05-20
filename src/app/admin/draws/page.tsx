import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents, getCurrentPeriod, monthLabel } from "@/lib/utils";
import { NewDrawForm } from "./new-draw";

export const dynamic = "force-dynamic";

export default async function AdminDrawsPage() {
  const admin = createAdminClient();
  const { year, month } = getCurrentPeriod();

  const { data: draws } = await admin
    .from("draws")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  const exists = (draws || []).find((d) => d.period_year === year && d.period_month === month);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Draws</h1>
        <p className="text-ink-600 mt-1">Create, simulate, and publish monthly draws.</p>
      </header>

      {!exists && (
        <NewDrawForm currentYear={year} currentMonth={month} />
      )}

      <div className="space-y-4">
        {(draws || []).map((d) => (
          <Link key={d.id} href={`/admin/draws/${d.id}`} className="card p-5 block hover:shadow-glow transition-shadow">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-ink-500">
                  {monthLabel(d.period_year, d.period_month)}
                </div>
                <div className="font-display text-xl font-bold capitalize">{d.logic} draw</div>
              </div>
              <div className="text-right">
                <span className="badge mb-1 capitalize">{d.status}</span>
                <div className="text-sm">{formatCents(d.total_pool_cents + d.rollover_in_cents)} pool</div>
              </div>
            </div>
            {d.winning_numbers && (
              <div className="mt-3 flex gap-1.5">
                {d.winning_numbers.map((n: number) => (
                  <span
                    key={n}
                    className="h-8 w-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-bold"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {!draws?.length && (
          <div className="card p-10 text-center text-ink-500">No draws yet.</div>
        )}
      </div>
    </div>
  );
}
