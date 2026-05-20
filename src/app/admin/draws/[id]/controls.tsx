"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/utils";

interface SimulationResult {
  simulated: true;
  logic: "random" | "algorithmic";
  winning_numbers: number[];
  pools: {
    total_pool_cents: number;
    rollover_in_cents: number;
    pool_5_cents: number;
    pool_4_cents: number;
    pool_3_cents: number;
  };
  rollover_out_cents: number;
  excluded_for_missing_scores?: number;
  entries: Array<{
    user_id: string;
    numbers: number[];
    matches: number;
    tier: 3 | 4 | 5 | null;
    prize_cents: number;
  }>;
}

export function DrawControls({
  drawId, status, logic,
}: {
  drawId: string;
  status: "draft" | "simulated" | "published";
  logic: "random" | "algorithmic";
}) {
  const router = useRouter();
  const [newLogic, setNewLogic] = useState(logic);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<SimulationResult | null>(null);

  async function call(action: "simulate" | "run" | "publish", body: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    if (action !== "simulate") setSim(null);
    const res = await fetch(`/api/admin/draws/${drawId}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    if (action === "simulate") {
      setSim(data);
      return; // don't refresh — simulation is non-persistent
    }
    router.refresh();
  }

  const isPublished = status === "published";
  const tierCount = (t: 3 | 4 | 5) => sim?.entries.filter((e) => e.tier === t).length ?? 0;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-semibold text-ink-700">Logic</label>
          <select
            value={newLogic}
            onChange={(e) => setNewLogic(e.target.value as "random" | "algorithmic")}
            disabled={isPublished}
            className="field mt-1 py-1.5"
          >
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic</option>
          </select>
        </div>
        <button
          onClick={() => call("simulate", { logic: newLogic })}
          disabled={!!busy || isPublished}
          className="btn-outline"
        >
          {busy === "simulate" ? "Simulating..." : "Simulate"}
        </button>
        <button
          onClick={() => call("run", { logic: newLogic })}
          disabled={!!busy || isPublished}
          className="btn-primary"
        >
          {busy === "run" ? "Running..." : "Run draw"}
        </button>
        <button
          onClick={() => call("publish")}
          disabled={!!busy || isPublished || status === "draft"}
          className="btn-brand"
        >
          {busy === "publish" ? "Publishing..." : isPublished ? "Published" : "Publish results"}
        </button>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {sim && (
        <div className="mt-4 card p-5 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="badge-amber">Simulation · not saved</span>
              <div className="mt-1 font-semibold capitalize">{sim.logic} pre-analysis</div>
              <p className="text-xs text-ink-600 mt-1">
                What would happen if this were run right now. Click <strong>Run draw</strong> to persist.
              </p>
            </div>
            <button onClick={() => setSim(null)} className="text-sm text-ink-500 hover:underline">Dismiss</button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sim.winning_numbers.map((n) => (
              <span
                key={n}
                className="h-10 w-10 rounded-full bg-ink-900 text-white flex items-center justify-center font-bold"
              >
                {n}
              </span>
            ))}
          </div>

          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
            <TierBox tier={5} cents={sim.pools.pool_5_cents} count={tierCount(5)} />
            <TierBox tier={4} cents={sim.pools.pool_4_cents} count={tierCount(4)} />
            <TierBox tier={3} cents={sim.pools.pool_3_cents} count={tierCount(3)} />
          </div>

          <div className="mt-3 text-xs text-ink-600">
            Total pool: <strong>{formatCents(sim.pools.total_pool_cents)}</strong>
            {sim.pools.rollover_in_cents > 0 && (
              <> · Rollover in: <strong>{formatCents(sim.pools.rollover_in_cents)}</strong></>
            )}
            {sim.rollover_out_cents > 0 && (
              <> · Would roll to next month: <strong>{formatCents(sim.rollover_out_cents)}</strong></>
            )}
            <> · Entries scored: <strong>{sim.entries.length}</strong></>
            {!!sim.excluded_for_missing_scores && (
              <> · Excluded (&lt;5 scores): <strong>{sim.excluded_for_missing_scores}</strong></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TierBox({ tier, cents, count }: { tier: 3 | 4 | 5; cents: number; count: number }) {
  return (
    <div className="rounded-xl bg-white p-3 border border-amber-200">
      <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-400">
        {tier}-number tier
      </div>
      <div className="font-bold">{formatCents(cents)}</div>
      <div className="text-xs text-ink-500">{count} winner{count === 1 ? "" : "s"}</div>
    </div>
  );
}
