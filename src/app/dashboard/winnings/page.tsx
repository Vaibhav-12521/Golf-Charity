import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDate, monthLabel } from "@/lib/utils";
import { ProofUploader } from "./proof";

export const dynamic = "force-dynamic";

export default async function WinningsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const supabase = createClient();

  const { data: winners } = await supabase
    .from("winners")
    .select("*, draws(period_year, period_month)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const total = (winners || []).reduce((s, w) => s + (w.status === "paid" ? w.prize_cents : 0), 0);
  const pending = (winners || []).reduce(
    (s, w) => s + (w.status !== "paid" && w.status !== "rejected" ? w.prize_cents : 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Winnings</h1>
        <p className="text-ink-600 mt-1">Your prize history, verification status, and payouts.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Total paid" value={formatCents(total)} />
        <Stat label="Pending payout" value={formatCents(pending)} />
        <Stat label="Wins recorded" value={String((winners || []).length)} />
      </div>

      <div className="space-y-4">
        {(winners || []).map((w) => {
          const drawLabel = w.draws
            ? monthLabel((w.draws as { period_year: number; period_month: number }).period_year, (w.draws as { period_year: number; period_month: number }).period_month)
            : "";
          return (
            <div key={w.id} className="card p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-ink-500">{drawLabel}</div>
                  <div className="font-display text-xl font-bold">Tier {w.tier} · {formatCents(w.prize_cents)}</div>
                  <div className="text-xs text-ink-400">Recorded {formatDate(w.created_at)}</div>
                </div>
                <StatusBadge status={w.status} />
              </div>
              {w.status !== "paid" && w.status !== "rejected" && (
                <div className="mt-4">
                  <ProofUploader winnerId={w.id} hasProof={!!w.proof_url} />
                </div>
              )}
              {w.admin_notes && (
                <p className="mt-3 text-sm text-ink-600 bg-ink-50 rounded-lg p-3">
                  <strong>Admin note:</strong> {w.admin_notes}
                </p>
              )}
            </div>
          );
        })}
        {!winners?.length && (
          <div className="card p-10 text-center text-ink-500">
            No winnings yet. Keep logging those rounds.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase font-semibold text-ink-400">{label}</div>
      <div className="mt-1 text-2xl font-bold font-display">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_proof: "badge-amber",
    pending_review: "badge-amber",
    approved: "badge-brand",
    paid: "badge-green",
    rejected: "badge-red",
  };
  const labels: Record<string, string> = {
    pending_proof: "Upload proof",
    pending_review: "Under review",
    approved: "Approved — awaiting payout",
    paid: "Paid",
    rejected: "Rejected",
  };
  return <span className={map[status] || "badge"}>{labels[status] || status}</span>;
}
