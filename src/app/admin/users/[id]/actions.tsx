"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export function ManageSubscriptionButton({ userId, hasCustomer }: { userId: string; hasCustomer: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/portal`, { method: "POST" });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error || "Failed to open portal");
    if (body.url) window.open(body.url, "_blank");
  }

  if (!hasCustomer) {
    return (
      <p className="text-xs text-ink-500">
        No Stripe customer yet — user must complete a checkout first.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button onClick={openPortal} disabled={busy} className="btn-outline">
        <ExternalLink className="h-4 w-4" />
        {busy ? "Opening..." : "Manage in Stripe"}
      </button>
      <p className="text-[11px] text-ink-400 max-w-xs">
        Opens the Stripe-hosted portal. Cancellations / plan changes sync back via webhook.
      </p>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
