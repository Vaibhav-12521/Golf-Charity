"use client";

import { useState } from "react";

export function DonateForm({ charityId }: { charityId: string }) {
  const [amount, setAmount] = useState<string>("25");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          charity_id: charityId,
          amount_cents: Math.round(parseFloat(amount) * 100),
          donor_name: name,
          donor_email: email,
          message: msg,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Thank you — your donation has been recorded. A receipt will be emailed.");
      setMsg("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit donation");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <div className="mt-4 text-sm text-accent-700 bg-accent-50 rounded-lg p-3">{success}</div>;
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label className="text-xs font-semibold text-ink-600">Amount (USD)</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="field mt-1"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-600">Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-600">Message (optional)</label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="field mt-1"
          rows={2}
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={loading} className="btn-brand w-full justify-center">
        {loading ? "Recording..." : "Donate now"}
      </button>
      <p className="text-[11px] text-ink-400">
        Sign-in required. Recorded as a pledge — Stripe payment-intent integration
        ships next.
      </p>
    </form>
  );
}
