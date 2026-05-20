"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SubscriptionActions({
  hasSub,
  active,
  autoSync = false,
}: {
  hasSub: boolean;
  active: boolean;
  autoSync?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | "sync" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const didAutoSync = useRef(false);

  async function sync(silent = false) {
    if (!silent) setLoading("sync");
    setError(null);
    if (!silent) setInfo(null);
    const res = await fetch("/api/stripe/sync", { method: "POST" });
    const body = await res.json();
    if (!silent) setLoading(null);
    if (!res.ok) {
      if (!silent) setError(body.error || "Sync failed");
      return false;
    }
    setInfo(
      `Synced ${body.subscriptions_synced} subscription(s) and ${body.invoices_synced} payment(s) from Stripe.`,
    );
    router.refresh();
    return true;
  }

  // Auto-sync when the user lands here right after a successful Stripe checkout.
  // Strict-mode-safe via the `didAutoSync` ref guard.
  useEffect(() => {
    if (!autoSync || didAutoSync.current) return;
    didAutoSync.current = true;
    setLoading("sync");
    sync(true).finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  async function checkout(plan: "monthly" | "yearly") {
    setLoading(plan);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();
    setLoading(null);
    if (!res.ok) return setError(body.error || "Checkout error");
    if (body.url) window.location.href = body.url;
  }

  async function portal() {
    setLoading("portal");
    setError(null);
    setInfo(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await res.json();
    setLoading(null);
    if (!res.ok) return setError(body.error || "Portal error");
    if (body.url) window.location.href = body.url;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {!active && (
          <>
            <button onClick={() => checkout("monthly")} disabled={!!loading} className="btn-primary">
              {loading === "monthly" ? "Redirecting..." : "Start monthly plan"}
            </button>
            <button onClick={() => checkout("yearly")} disabled={!!loading} className="btn-brand">
              {loading === "yearly" ? "Redirecting..." : "Start yearly plan"}
            </button>
          </>
        )}
        {hasSub && (
          <button onClick={portal} disabled={!!loading} className="btn-outline">
            {loading === "portal" ? "Opening..." : "Manage billing & cancel"}
          </button>
        )}
        <button onClick={() => sync(false)} disabled={!!loading} className="btn-ghost">
          <RefreshCw className={`h-4 w-4 ${loading === "sync" ? "animate-spin" : ""}`} />
          {loading === "sync" ? "Syncing..." : "Sync from Stripe"}
        </button>
      </div>
      {info && <div className="text-sm text-accent-700">{info}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <p className="text-xs text-ink-400">
        Production uses Stripe webhooks (auto-sync, no button needed). Locally, click sync if the
        page doesn&rsquo;t auto-update — Stripe can&rsquo;t reach <code>localhost</code> directly.
      </p>
    </div>
  );
}
