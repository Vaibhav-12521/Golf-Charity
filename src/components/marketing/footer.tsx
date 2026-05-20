import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white mt-24">
      <div className="container-wide py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <BrandLogo size="sm" />
          <p className="mt-3 text-ink-500">
            Play a round. Change a life. A subscription-driven platform where every
            score-card funds a cause.
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3">Platform</div>
          <ul className="space-y-2 text-ink-600">
            <li><Link href="/how-it-works" className="hover:text-ink-900">How it works</Link></li>
            <li><Link href="/charities" className="hover:text-ink-900">Charities</Link></li>
            <li><Link href="/pricing" className="hover:text-ink-900">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Account</div>
          <ul className="space-y-2 text-ink-600">
            <li><Link href="/signup" className="hover:text-ink-900">Create account</Link></li>
            <li><Link href="/login" className="hover:text-ink-900">Log in</Link></li>
            <li><Link href="/dashboard" className="hover:text-ink-900">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Trust</div>
          <ul className="space-y-2 text-ink-600">
            <li>Secure auth · Supabase</li>
            <li>PCI compliant · Stripe</li>
            <li>HTTPS only</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Birdie &amp; Cause. Built for Digital Heroes trainee selection.
      </div>
    </footer>
  );
}
