"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function WinnerActions({
  winnerId, proofUrl, status, initialNotes,
}: {
  winnerId: string;
  proofUrl: string | null;
  status: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let canceled = false;
    if (proofUrl) {
      supabase.storage
        .from("winner-proofs")
        .createSignedUrl(proofUrl, 60 * 10)
        .then(({ data }) => {
          if (!canceled) setSignedUrl(data?.signedUrl || null);
        });
    }
    return () => { canceled = true; };
  }, [proofUrl, supabase.storage]);

  async function call(action: "approve" | "reject" | "mark_paid" | "note") {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/admin/winners/${winnerId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, admin_notes: notes }),
    });
    const body = await res.json();
    setBusy(null);
    if (!res.ok) return setError(body.error || "Failed");
    router.refresh();
  }

  return (
    <div className="mt-4 grid md:grid-cols-2 gap-4">
      <div>
        <div className="text-xs uppercase font-semibold text-ink-400">Proof</div>
        {signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={signedUrl} target="_blank" rel="noreferrer" className="block mt-2">
            <img src={signedUrl} alt="proof" className="max-h-64 rounded-lg border border-ink-100" />
          </a>
        ) : proofUrl ? (
          <div className="text-sm text-ink-500 mt-2">Loading proof...</div>
        ) : (
          <div className="text-sm text-ink-500 mt-2">No proof uploaded yet.</div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-ink-700">Admin notes</label>
          <textarea
            className="field mt-1"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes shown to the winner."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => call("note")} disabled={!!busy} className="btn-ghost">
            {busy === "note" ? "..." : "Save note"}
          </button>
          {status === "pending_review" && (
            <>
              <button onClick={() => call("approve")} disabled={!!busy} className="btn-primary">Approve</button>
              <button onClick={() => call("reject")} disabled={!!busy} className="btn-outline text-red-600">Reject</button>
            </>
          )}
          {status === "approved" && (
            <button onClick={() => call("mark_paid")} disabled={!!busy} className="btn-brand">Mark paid</button>
          )}
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
