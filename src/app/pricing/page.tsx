import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { formatCents } from "@/lib/utils";
import { Check } from "lucide-react";

export default function PricingPage() {
  const monthly = parseInt(process.env.SUBSCRIPTION_PRICE_MONTHLY_CENTS || "1500", 10);
  const yearly = parseInt(process.env.SUBSCRIPTION_PRICE_YEARLY_CENTS || "14400", 10);
  const yearlyMonthly = Math.round(yearly / 12);
  const savings = Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);

  const features = [
    "Monthly draw entry — 3, 4, or 5-number tiers",
    "Pick & switch your charity any time",
    "Last-5 score tracking in Stableford format",
    "Winner verification + payout workflow",
    "Dashboard with winnings & contribution totals",
    "Cancel any time — no questions asked",
  ];

  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-24">
        <div className="text-center">
          <span className="badge-brand">Pricing</span>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-4">One plan. Two cadences.</h1>
          <p className="mt-4 text-lg text-ink-600 max-w-2xl mx-auto">
            Pick whatever fits your year. Both unlock every feature.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="card p-8">
            <div className="text-sm font-semibold text-ink-500">Monthly</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-display font-bold">{formatCents(monthly)}</span>
              <span className="text-ink-500">/ month</span>
            </div>
            <p className="mt-2 text-ink-500 text-sm">Renews automatically. Cancel any time.</p>
            <Link href="/signup?plan=monthly" className="btn-outline mt-6 w-full justify-center">Subscribe monthly</Link>
            <ul className="mt-6 space-y-2.5 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent-600 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-8 relative bg-gradient-to-br from-ink-900 to-ink-800 text-white border-0">
            <span className="badge bg-brand-500 text-white absolute -top-3 right-6">Save {savings}%</span>
            <div className="text-sm font-semibold text-brand-200">Yearly</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-display font-bold">{formatCents(yearly)}</span>
              <span className="text-ink-300">/ year</span>
            </div>
            <p className="mt-2 text-ink-300 text-sm">
              ~{formatCents(yearlyMonthly)} / month — billed once.
            </p>
            <Link href="/signup?plan=yearly" className="btn-brand mt-6 w-full justify-center">Subscribe yearly</Link>
            <ul className="mt-6 space-y-2.5 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
