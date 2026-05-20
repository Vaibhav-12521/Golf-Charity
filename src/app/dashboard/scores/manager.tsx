"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Score } from "@/lib/types";

export function ScoreManager({ initial }: { initial: Score[] }) {
  const router = useRouter();
  const [scores, setScores] = useState(initial);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function addScore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      setError("Score must be an integer between 1 and 45.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: n, played_on: date }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error || "Could not save score.");
      return;
    }
    setValue("");
    setScores(body.scores);
    router.refresh();
  }

  async function deleteScore(id: string) {
    if (!confirm("Delete this score?")) return;
    const res = await fetch(`/api/scores?id=${id}`, { method: "DELETE" });
    const body = await res.json();
    if (res.ok) {
      setScores(body.scores);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addScore} className="card p-5">
        <div className="text-sm font-semibold">Add a score</div>
        <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-ink-700">Score (1–45)</label>
            <input
              type="number"
              min={1}
              max={45}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">Date played</label>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field mt-1"
              required
            />
          </div>
          <button disabled={loading} className="btn-brand">
            <Plus className="h-4 w-4" /> {loading ? "Saving..." : "Add"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </form>

      <div className="card p-5">
        <div className="text-sm font-semibold">Latest 5 scores</div>
        {scores.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No scores yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {scores.map((s) =>
              editingId === s.id ? (
                <EditRow
                  key={s.id}
                  score={s}
                  onCancel={() => setEditingId(null)}
                  onSaved={(scoresFromServer) => {
                    setScores(scoresFromServer);
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                      {s.value}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{formatDate(s.played_on)}</div>
                      <div className="text-xs text-ink-400">Stableford</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingId(s.id)}
                      className="text-sm text-ink-600 hover:bg-ink-100 rounded-lg p-2"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteScore(s.id)}
                      className="text-sm text-red-600 hover:bg-red-50 rounded-lg p-2"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditRow({
  score,
  onCancel,
  onSaved,
}: {
  score: Score;
  onCancel: () => void;
  onSaved: (scores: Score[]) => void;
}) {
  const [value, setValue] = useState(String(score.value));
  const [date, setDate] = useState(score.played_on);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      setError("Score must be 1–45.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/scores/${score.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: n, played_on: date }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error || "Failed to update.");
      return;
    }
    onSaved(body.scores);
  }

  return (
    <li className="py-3">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-ink-700">Score</label>
          <input
            type="number"
            min={1}
            max={45}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-700">Date</label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field mt-1"
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-brand"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-outline"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </li>
  );
}
