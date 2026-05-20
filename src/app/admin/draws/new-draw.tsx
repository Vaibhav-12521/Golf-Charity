"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/utils";

export function NewDrawForm({ currentYear, currentMonth }: { currentYear: number; currentMonth: number }) {
  const router = useRouter();
  const [logic, setLogic] = useState<"random" | "algorithmic">("random");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/draws", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logic, period_year: currentYear, period_month: currentMonth }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) return setError(body.error);
    router.push(`/admin/draws/${body.id}`);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="font-semibold">Start the {monthLabel(currentYear, currentMonth)} draw</div>
      <p className="text-sm text-ink-500 mt-1">
        Create a draft. You can simulate, re-run, or change logic before publishing.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-700">Logic</label>
          <select value={logic} onChange={(e) => setLogic(e.target.value as "random" | "algorithmic")} className="field mt-1">
            <option value="random">Random — uniform 1–45</option>
            <option value="algorithmic">Algorithmic — weighted by score frequency</option>
          </select>
        </div>
        <button onClick={create} disabled={loading} className="btn-brand">
          {loading ? "Creating..." : "Create draft draw"}
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  );
}
