import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-24">
        <span className="badge-brand">Mechanics</span>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-4">How a round becomes impact.</h1>
        <p className="mt-5 text-lg text-ink-600 max-w-2xl">
          A simple loop: subscribe, log your last five Stableford rounds, support a charity, and
          enter the monthly draw. Here&rsquo;s exactly how the engine works.
        </p>

        <div className="mt-12 space-y-8">
          <section className="card p-7">
            <h2 className="font-display text-2xl font-bold">1 · The subscription</h2>
            <p className="mt-2 text-ink-600">
              Monthly or yearly. Both unlock full platform features — score entry, monthly draw
              entry, charity selection, dashboard. The yearly plan is discounted (~20% off).
            </p>
            <ul className="mt-4 text-sm space-y-2 text-ink-700">
              <li>· Lifecycle handled end-to-end via Stripe (renewal, cancellation, lapsed).</li>
              <li>· Subscription status validated on every authenticated request.</li>
              <li>· Cancel any time from your dashboard&rsquo;s billing portal.</li>
            </ul>
          </section>

          <section className="card p-7">
            <h2 className="font-display text-2xl font-bold">2 · Your last five scores</h2>
            <p className="mt-2 text-ink-600">
              Enter your latest five rounds in <strong>Stableford format (1&ndash;45)</strong>, each with a date.
              When you add a sixth, the oldest is automatically dropped. Always the five most recent.
            </p>
            <ul className="mt-4 text-sm space-y-2 text-ink-700">
              <li>· Score range: <strong>1 &ndash; 45</strong> (rejected outside this range).</li>
              <li>· Rolling window enforced by a database trigger — no stale data.</li>
              <li>· Shown in reverse chronological order on your dashboard.</li>
            </ul>
          </section>

          <section className="card p-7">
            <h2 className="font-display text-2xl font-bold">3 · The monthly draw</h2>
            <p className="mt-2 text-ink-600">
              Once per month, admins run the draw. Five winning numbers (1&ndash;45) are produced either
              by uniform random selection or an algorithm weighted by the score frequencies across
              the entire subscriber base. Your five scores become your ticket.
            </p>
            <div className="mt-5 grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-ink-50 p-4 text-sm">
                <div className="font-semibold">5-number match</div>
                <div className="text-ink-500">40% of pool · jackpot</div>
              </div>
              <div className="rounded-xl bg-ink-50 p-4 text-sm">
                <div className="font-semibold">4-number match</div>
                <div className="text-ink-500">35% of pool</div>
              </div>
              <div className="rounded-xl bg-ink-50 p-4 text-sm">
                <div className="font-semibold">3-number match</div>
                <div className="text-ink-500">25% of pool</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-600">
              Multiple winners in a tier split the tier&rsquo;s pool equally. If nobody hits all five
              numbers, the jackpot rolls forward to the next month.
            </p>
          </section>

          <section className="card p-7">
            <h2 className="font-display text-2xl font-bold">4 · Charity contribution</h2>
            <p className="mt-2 text-ink-600">
              A minimum of <strong>10%</strong> of every payment is sent to the charity you select. You can
              choose to send more. Standalone donations (no subscription required) are also supported.
            </p>
          </section>

          <section className="card p-7">
            <h2 className="font-display text-2xl font-bold">5 · Winner verification</h2>
            <p className="mt-2 text-ink-600">
              Winners upload a screenshot of their score-card from their official golf platform.
              Admins review and approve before payout. Payouts are tracked Pending → Paid.
            </p>
          </section>

          <section className="card p-7 bg-ink-900 text-white border-0">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 text-brand-400 shrink-0" />
              <div>
                <h2 className="font-display text-2xl font-bold">Trust by design</h2>
                <p className="mt-2 text-ink-200">
                  HTTPS-only. PCI-compliant payments via Stripe. Row-level security on every table.
                  Admin actions are logged. Pool math is deterministic and auditable.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/signup" className="btn-brand">
            Start playing for a cause <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
