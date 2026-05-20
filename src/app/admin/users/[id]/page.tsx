import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents, formatDate } from "@/lib/utils";
import { ScoreEditor } from "./score-editor";
import { ManageSubscriptionButton } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*, charities:charity_id(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: subs }, { data: scores }, { data: payments }, { data: winners }] = await Promise.all([
    admin.from("subscriptions").select("*").eq("user_id", params.id).order("updated_at", { ascending: false }),
    admin.from("scores").select("*").eq("user_id", params.id).order("played_on", { ascending: false }),
    admin.from("payments").select("*").eq("user_id", params.id).order("created_at", { ascending: false }).limit(20),
    admin.from("winners").select("*").eq("user_id", params.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">{profile.full_name || profile.email}</h1>
          <p className="text-ink-600 mt-1">{profile.email}</p>
          <p className="text-xs text-ink-500 mt-1">
            Joined {formatDate(profile.created_at)} · charity: {(profile.charities as { name: string } | null)?.name || "none"} ({profile.charity_percent}%)
          </p>
        </div>
        <ManageSubscriptionButton
          userId={profile.id}
          hasCustomer={!!profile.stripe_customer_id}
        />
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="font-semibold">Subscriptions</div>
          {subs?.length ? (
            <table className="w-full mt-3 text-sm">
              <thead>
                <tr className="text-left text-ink-500">
                  <th className="py-2">Plan</th>
                  <th>Status</th>
                  <th>Renews</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-ink-100">
                    <td className="py-2 capitalize">{s.plan}</td>
                    <td>{s.status}</td>
                    <td>{s.current_period_end ? formatDate(s.current_period_end) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-ink-500">No subscriptions.</p>
          )}
        </div>

        <div className="card p-5">
          <div className="font-semibold">Wins</div>
          {winners?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {winners.map((w) => (
                <li key={w.id} className="flex justify-between border-t border-ink-100 pt-2">
                  <span>Tier {w.tier} · {w.status}</span>
                  <span className="font-semibold">{formatCents(w.prize_cents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-500">None yet.</p>
          )}
        </div>
      </div>

      <ScoreEditor userId={profile.id} initial={scores || []} />

      <div className="card p-5">
        <div className="font-semibold">Recent payments</div>
        {payments?.length ? (
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="py-2">Date</th><th>Amount</th><th>To charity</th><th>To pool</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="py-2">{formatDate(p.created_at)}</td>
                  <td>{formatCents(p.amount_cents)}</td>
                  <td>{formatCents(p.charity_amount_cents)}</td>
                  <td>{formatCents(p.pool_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-ink-500">No payments.</p>
        )}
      </div>
    </div>
  );
}
