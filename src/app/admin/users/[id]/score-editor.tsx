"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Score } from "@/lib/types";

export function ScoreEditor({ userId, initial }: { userId: string; initial: Score[] }) {
  const router = useRouter();
  const [scores, setScores] = useState(initial);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      setError("Score must be between 1 and 45.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/scores`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: n, played_on: date }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error || "Failed");
      return;
    }
    setScores(body.scores);
    setValue("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this score?")) return;
    const res = await fetch(`/api/admin/users/${userId}/scores?id=${id}`, { method: "DELETE" });
    const body = await res.json();
    if (res.ok) {
      setScores(body.scores);
      router.refresh();
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Edit scores (admin override)</div>
        <span className="text-xs text-ink-500">Rolling window: latest 5</span>
      </div>
      <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-ink-700">Score</label>
          <input type="number" min={1} max={45} value={value} onChange={(e) => setValue(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-700">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-1" />
        </div>
        <button onClick={add} disabled={loading} className="btn-brand">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {scores.length > 0 && (
        <ul className="mt-4 divide-y divide-ink-100">
          {scores.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div className="text-sm">
                <strong>{s.value}</strong> · {formatDate(s.played_on)}
              </div>
              <button onClick={() => remove(s.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
