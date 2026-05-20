import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionActive } from "@/lib/types";
import { ScoreManager } from "./manager";
import { ArrowRight, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const supabase = createClient();

  const [{ data: scores }, { data: sub }] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("user_id", session.user.id)
      .order("played_on", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const active = isSubscriptionActive(sub);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">My Scores</h1>
        <p className="text-ink-600 mt-1">
          Log your last 5 rounds in Stableford (1–45). Adding a 6th drops the oldest automatically.
        </p>
      </header>

      {!active && (
        <div className="card p-5 bg-amber-50 border-amber-100">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-amber-700 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900">Subscription required to log scores.</div>
              <p className="text-sm text-amber-800 mt-1">
                PRD §04: non-subscribers receive restricted access. Activate your subscription
                to enter scores and participate in this month&rsquo;s draw.
              </p>
            </div>
            <Link href="/dashboard/subscription" className="btn-brand">
              Activate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {active ? (
        <ScoreManager initial={scores || []} />
      ) : (
        <div className="card p-6 opacity-60 pointer-events-none">
          <div className="text-sm font-semibold">Score entry locked</div>
          <p className="mt-2 text-sm text-ink-500">
            Once your subscription is active, you can log up to 5 scores. The oldest is replaced automatically when a sixth is added.
          </p>
        </div>
      )}
    </div>
  );
}
