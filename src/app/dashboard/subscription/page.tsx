import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDate } from "@/lib/utils";
import { isSubscriptionActive } from "@/lib/types";
import { SubscriptionActions } from "./actions";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  searchParams,
}: {
  // `success=1`  → return from successful Stripe Checkout
  // `canceled=1` → return from abandoned Stripe Checkout
  // `refresh=1`  → return from Stripe Customer Portal (cancel/upgrade/etc)
  searchParams: { success?: string; canceled?: string; refresh?: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const supabase = createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const active = isSubscriptionActive(sub);
  const willCancel = active && sub?.cancel_at_period_end === true;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Subscription</h1>
        <p className="text-ink-600 mt-1">Manage your plan and view payment history.</p>
      </header>

      {searchParams.success && (
        <div className="card p-4 bg-accent-50 text-accent-900 text-sm">Welcome — your subscription is being activated.</div>
      )}
      {searchParams.canceled && (
        <div className="card p-4 bg-amber-50 text-amber-900 text-sm">Checkout canceled. You can try again any time.</div>
      )}

      {willCancel && (
        <div className="card p-5 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-amber-900">
                Your subscription is scheduled to cancel.
              </div>
              <p className="text-sm text-amber-800 mt-1">
                You&rsquo;ll keep access until{" "}
                <strong>{formatDate(sub?.current_period_end)}</strong>.
                After that, you won&rsquo;t be entered in the monthly draw and your
                charity contributions stop. Resume any time before then via{" "}
                <strong>Manage billing</strong> below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400">Current plan</div>
            <div className="font-display text-2xl font-bold mt-1 capitalize">{sub?.plan || "—"}</div>
            <div className="text-sm text-ink-500 mt-1">
              Status:{" "}
              <span
                className={`font-semibold ${
                  willCancel
                    ? "text-amber-700"
                    : active
                      ? "text-accent-700"
                      : "text-ink-700"
                }`}
              >
                {willCancel ? "Active — canceling" : sub?.status || "none"}
              </span>
              {sub?.current_period_end && (
                <>
                  {" · "}
                  {willCancel ? "ends" : "renews"} {formatDate(sub.current_period_end)}
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-ink-400">Recurring amount</div>
            <div className="font-display text-2xl font-bold mt-1">{formatCents(sub?.amount_cents || 0)}</div>
          </div>
        </div>

        <div className="mt-6">
          <SubscriptionActions
            hasSub={!!sub}
            active={active}
            // Auto-sync if returning from EITHER checkout success OR the
            // Stripe Customer Portal (cancel/plan-change/payment-method).
            autoSync={
              searchParams.success === "1" || searchParams.refresh === "1"
            }
          />
        </div>
      </div>

      <div className="card p-6">
        <div className="font-semibold">Payment history</div>
        {payments?.length ? (
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="py-2">Date</th>
                <th>Amount</th>
                <th>To charity</th>
                <th>To pool</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="py-2">{formatDate(p.created_at)}</td>
                  <td>{formatCents(p.amount_cents)}</td>
                  <td className="text-accent-700">{formatCents(p.charity_amount_cents)}</td>
                  <td className="text-brand-700">{formatCents(p.pool_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-ink-500">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
