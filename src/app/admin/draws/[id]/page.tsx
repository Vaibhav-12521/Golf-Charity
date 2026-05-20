import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents, formatDate, monthLabel } from "@/lib/utils";
import { DrawControls } from "./controls";

export const dynamic = "force-dynamic";

export default async function AdminDrawDetail({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: draw } = await admin.from("draws").select("*").eq("id", params.id).maybeSingle();
  if (!draw) notFound();

  const { data: entries } = await admin
    .from("draw_entries")
    .select("*, profiles:user_id(email, full_name)")
    .eq("draw_id", params.id)
    .order("matches", { ascending: false });

  const winners5 = (entries || []).filter((e) => e.tier === 5);
  const winners4 = (entries || []).filter((e) => e.tier === 4);
  const winners3 = (entries || []).filter((e) => e.tier === 3);

  return (
    <div className="space-y-6">
      <header>
        <div>
          <div className="text-sm font-semibold text-ink-500">
            {monthLabel(draw.period_year, draw.period_month)}
          </div>
          <h1 className="font-display text-3xl font-bold capitalize">{draw.logic} draw</h1>
          <p className="text-xs text-ink-500 mt-1">
            Status: <strong>{draw.status}</strong>
            {draw.ran_at && <> · Ran {formatDate(draw.ran_at)}</>}
            {draw.published_at && <> · Published {formatDate(draw.published_at)}</>}
          </p>
        </div>
      </header>
      <div className="card p-5">
        <div className="text-xs uppercase font-semibold tracking-wider text-ink-400 mb-3">
          Draw controls
        </div>
        <DrawControls drawId={draw.id} status={draw.status} logic={draw.logic} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total pool" value={formatCents(draw.total_pool_cents)} />
        <Stat label="Rollover in" value={formatCents(draw.rollover_in_cents)} />
        <Stat label="Rollover out" value={formatCents(draw.rollover_out_cents)} />
        <Stat label="Entries" value={(entries || []).length.toString()} />
      </div>

      <div className="card p-5">
        <div className="font-semibold">Winning numbers</div>
        {draw.winning_numbers ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {draw.winning_numbers.map((n: number) => (
              <span key={n} className="h-12 w-12 rounded-full bg-ink-900 text-white flex items-center justify-center font-bold text-lg">
                {n}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-500">Not generated yet. Run the draw to produce winning numbers.</p>
        )}

        <div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
          <PoolBox tier={5} cents={draw.pool_5_cents} count={winners5.length} />
          <PoolBox tier={4} cents={draw.pool_4_cents} count={winners4.length} />
          <PoolBox tier={3} cents={draw.pool_3_cents} count={winners3.length} />
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold">Entries by tier</div>
        <TierTable label="5-number winners" rows={winners5} />
        <TierTable label="4-number winners" rows={winners4} />
        <TierTable label="3-number winners" rows={winners3} />

        <details className="mt-4">
          <summary className="text-sm text-ink-500 cursor-pointer">Show all entries ({(entries || []).length})</summary>
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="py-2">User</th><th>Numbers</th><th>Matches</th><th>Prize</th>
              </tr>
            </thead>
            <tbody>
              {(entries || []).map((e) => (
                <tr key={e.id} className="border-t border-ink-100">
                  <td className="py-1.5 text-xs">
                    {(e.profiles as { full_name?: string; email: string } | null)?.full_name || (e.profiles as { email: string } | null)?.email}
                  </td>
                  <td className="text-xs">{e.numbers.join(", ")}</td>
                  <td>{e.matches}</td>
                  <td>{formatCents(e.prize_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      {draw.notes && (
        <div className="card p-5">
          <div className="font-semibold">Notes</div>
          <pre className="text-xs whitespace-pre-wrap text-ink-600 mt-2">{draw.notes}</pre>
        </div>
      )}
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

function PoolBox({ tier, cents, count }: { tier: 3 | 4 | 5; cents: number; count: number }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-400">
        {tier}-number tier
      </div>
      <div className="font-bold">{formatCents(cents)}</div>
      <div className="text-xs text-ink-500">{count} winner{count === 1 ? "" : "s"}</div>
    </div>
  );
}

function TierTable({ label, rows }: { label: string; rows: Array<{ id: string; numbers: number[]; prize_cents: number; profiles: { full_name?: string; email: string } | null }> }) {
  if (!rows.length) return null;
  return (
    <div className="mt-4">
      <div className="text-xs uppercase font-semibold tracking-wider text-ink-400">{label}</div>
      <ul className="mt-2 divide-y divide-ink-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span>{r.profiles?.full_name || r.profiles?.email}</span>
            <span className="font-semibold">{formatCents(r.prize_cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
