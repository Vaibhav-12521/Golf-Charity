import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents, monthLabel, getCurrentPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const admin = createAdminClient();
  const { year, month } = getCurrentPeriod();

  const [
    { count: totalUsers },
    { count: activeSubs },
    payments,
    donations,
    drawsThisYear,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    admin.from("payments").select("pool_amount_cents, charity_amount_cents, amount_cents, period_year, period_month"),
    admin.from("donations").select("amount_cents, source"),
    admin.from("draws").select("id, status, period_year, period_month, total_pool_cents").eq("period_year", year),
  ]);

  const totalPool = (payments.data || []).reduce((s, p) => s + p.pool_amount_cents, 0);
  const totalCharity = (payments.data || []).reduce((s, p) => s + p.charity_amount_cents, 0);
  const totalRevenue = (payments.data || []).reduce((s, p) => s + p.amount_cents, 0);
  const standaloneDonations = (donations.data || []).filter(d => d.source === "standalone").reduce((s, d) => s + d.amount_cents, 0);

  // current-month pool contribution
  const currentMonthPool = (payments.data || [])
    .filter(p => p.period_year === year && p.period_month === month)
    .reduce((s, p) => s + p.pool_amount_cents, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-ink-600 mt-1">{monthLabel(year, month)} · live across the platform.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total users" value={(totalUsers ?? 0).toString()} />
        <Stat label="Active subscriptions" value={(activeSubs ?? 0).toString()} />
        <Stat label="All-time revenue" value={formatCents(totalRevenue)} />
        <Stat label="Charity contributed" value={formatCents(totalCharity + standaloneDonations)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="text-xs uppercase font-semibold tracking-wider text-ink-400">All-time prize pool inflow</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatCents(totalPool)}</div>
          <p className="text-sm text-ink-500 mt-2">
            This figure is the cumulative sum of every payment&rsquo;s pool contribution after charity is split out.
          </p>
        </div>
        <div className="card p-6">
          <div className="text-xs uppercase font-semibold tracking-wider text-ink-400">This month&rsquo;s pool contribution</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatCents(currentMonthPool)}</div>
          <p className="text-sm text-ink-500 mt-2">
            Used to compute pool tiers when this month&rsquo;s draw is run.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <div className="font-semibold">Draws this year</div>
        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="py-2">Period</th>
              <th>Status</th>
              <th>Total pool</th>
            </tr>
          </thead>
          <tbody>
            {(drawsThisYear.data || []).map(d => (
              <tr key={d.id} className="border-t border-ink-100">
                <td className="py-2">{monthLabel(d.period_year, d.period_month)}</td>
                <td><span className="badge">{d.status}</span></td>
                <td>{formatCents(d.total_pool_cents)}</td>
              </tr>
            ))}
            {!drawsThisYear.data?.length && (
              <tr><td colSpan={3} className="py-3 text-ink-500">No draws this year.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase font-semibold tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
