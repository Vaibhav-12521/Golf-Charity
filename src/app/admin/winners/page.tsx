import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents, formatDate, monthLabel } from "@/lib/utils";
import { WinnerActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage() {
  const admin = createAdminClient();
  const { data: winners } = await admin
    .from("winners")
    .select("*, draws(period_year, period_month), profiles:user_id(email, full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Winners</h1>
        <p className="text-ink-600 mt-1">Verify proof submissions and release payouts.</p>
      </header>

      <div className="space-y-4">
        {(winners || []).map((w) => {
          const profile = w.profiles as unknown as { email: string; full_name: string | null } | null;
          const draw = w.draws as unknown as { period_year: number; period_month: number } | null;
          return (
            <div key={w.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{profile?.full_name || profile?.email}</div>
                  <div className="text-xs text-ink-500">{profile?.email}</div>
                  <div className="text-sm mt-2">
                    {draw && monthLabel(draw.period_year, draw.period_month)} · Tier {w.tier} · {formatCents(w.prize_cents)}
                  </div>
                  <div className="text-xs text-ink-400">Created {formatDate(w.created_at)}</div>
                </div>
                <StatusBadge status={w.status} />
              </div>

              <WinnerActions
                winnerId={w.id}
                proofUrl={w.proof_url}
                status={w.status}
                initialNotes={w.admin_notes || ""}
              />
            </div>
          );
        })}
        {!winners?.length && (
          <div className="card p-10 text-center text-ink-500">No winners yet.</div>
        )}
      </div>
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
  return <span className={map[status] || "badge"}>{status.replace("_", " ")}</span>;
}
