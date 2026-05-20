import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DrawsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const supabase = createClient();

  const { data: draws } = await supabase
    .from("draws")
    .select("*")
    .eq("status", "published")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  const { data: entries } = await supabase
    .from("draw_entries")
    .select("draw_id, numbers, matches, tier, prize_cents")
    .eq("user_id", session.user.id);

  const myEntries = new Map((entries || []).map((e) => [e.draw_id, e]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Draws</h1>
        <p className="text-ink-600 mt-1">Monthly published draws and how your numbers performed.</p>
      </header>

      <div className="space-y-4">
        {(draws || []).map((d) => {
          const mine = myEntries.get(d.id);
          return (
            <div key={d.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink-500">
                    {monthLabel(d.period_year, d.period_month)}
                  </div>
                  <div className="font-display text-xl font-bold capitalize">{d.logic} draw</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-400">Total pool</div>
                  <div className="font-bold">{formatCents(d.total_pool_cents + d.rollover_in_cents)}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(d.winning_numbers || []).map((n: number) => (
                  <span
                    key={n}
                    className="h-10 w-10 rounded-full bg-ink-900 text-white flex items-center justify-center font-bold"
                  >
                    {n}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                <PoolBox tier={5} cents={d.pool_5_cents} />
                <PoolBox tier={4} cents={d.pool_4_cents} />
                <PoolBox tier={3} cents={d.pool_3_cents} />
              </div>

              {mine ? (
                <div className="mt-5 rounded-xl bg-ink-50 p-4 text-sm">
                  <div className="font-semibold">Your entry</div>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {(mine.numbers as number[]).map((n: number, i: number) => (
                      <span key={i} className="h-8 w-8 rounded-full bg-white border border-ink-200 text-ink-700 flex items-center justify-center font-semibold">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-ink-600">
                    Matches: <strong>{mine.matches}</strong>
                    {mine.tier ? (
                      <> · Tier <strong>{mine.tier}</strong> · Prize <strong>{formatCents(mine.prize_cents)}</strong></>
                    ) : (
                      " · No tier this month"
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-sm text-ink-500">No entry submitted for this draw.</div>
              )}
            </div>
          );
        })}
        {!draws?.length && (
          <div className="card p-10 text-center text-ink-500">
            No published draws yet. The first monthly draw will appear here once an admin publishes it.
          </div>
        )}
      </div>
    </div>
  );
}

function PoolBox({ tier, cents }: { tier: 3 | 4 | 5; cents: number }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-400">
        {tier}-number match
      </div>
      <div className="font-bold">{formatCents(cents)}</div>
    </div>
  );
}
