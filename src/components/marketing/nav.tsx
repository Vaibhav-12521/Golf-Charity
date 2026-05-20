import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingNavMobile } from "./nav-mobile";

export async function MarketingNav() {
  const session = await getSessionUser();
  const isAdmin = session?.profile.role === "admin";
  const signedIn = !!session;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-ink-100">
      <div className="container-wide flex items-center justify-between py-3 md:py-4">
        <Link href="/" aria-label="Birdie & Cause home">
          <BrandLogo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-700">
          <Link href="/how-it-works" className="hover:text-ink-900">How it works</Link>
          <Link href="/charities" className="hover:text-ink-900">Charities</Link>
          <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {signedIn ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="text-sm text-ink-700 hover:text-ink-900">Admin</Link>
              )}
              <Link href="/dashboard" className="btn-outline text-sm">Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-ink-700 hover:text-ink-900">Log in</Link>
              <Link href="/signup" className="btn-brand text-sm">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger trigger + drawer */}
        <MarketingNavMobile signedIn={signedIn} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
