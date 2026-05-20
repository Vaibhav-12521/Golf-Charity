"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketingNavMobile({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while drawer open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-ink-200 bg-white hover:bg-ink-50"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-[60px] z-30 bg-ink-900/30 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "mx-4 mt-2 card p-4 animate-fade-up",
            )}
          >
            <nav className="flex flex-col gap-1 text-sm">
              <Link href="/how-it-works" className="px-3 py-2.5 rounded-xl hover:bg-ink-100">How it works</Link>
              <Link href="/charities" className="px-3 py-2.5 rounded-xl hover:bg-ink-100">Charities</Link>
              <Link href="/pricing" className="px-3 py-2.5 rounded-xl hover:bg-ink-100">Pricing</Link>
            </nav>
            <div className="mt-3 pt-3 border-t border-ink-100 flex flex-col gap-2">
              {signedIn ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" className="btn-outline text-sm">Admin Console</Link>
                  )}
                  <Link href="/dashboard" className="btn-primary text-sm">Open Dashboard</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-outline text-sm">Log in</Link>
                  <Link href="/signup" className="btn-brand text-sm">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
