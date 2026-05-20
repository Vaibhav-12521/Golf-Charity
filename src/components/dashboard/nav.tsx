"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  Gauge, ListChecks, Heart, Trophy, CreditCard, Dice5,
  LogOut, ShieldCheck, Settings, Menu, X,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/scores", label: "My Scores", icon: ListChecks },
  { href: "/dashboard/charity", label: "Charity", icon: Heart },
  { href: "/dashboard/draws", label: "Draws", icon: Dice5 },
  { href: "/dashboard/winnings", label: "Winnings", icon: Trophy },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const currentLabel = links.find((l) =>
    l.href === pathname || (l.href !== "/dashboard" && pathname.startsWith(l.href)),
  )?.label ?? "Overview";

  return (
    <>
      {/* ─── MOBILE TOP BAR ─── */}
      <div className="md:hidden">
        <div className="card p-3 flex items-center justify-between">
          <Link href="/" aria-label="Birdie & Cause home">
            <BrandLogo size="sm" />
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium hover:bg-ink-50"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{currentLabel}</span>
          </button>
        </div>

        {/* Drawer */}
        {open && (
          <div className="card p-2 mt-2 animate-fade-up">
            <nav className="flex flex-col gap-1">
              {links.map((l) => {
                const active =
                  pathname === l.href ||
                  (l.href !== "/dashboard" && pathname.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100",
                    )}
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </Link>
              )}
              <button
                onClick={logout}
                className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-100 w-full"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden md:block md:w-56 lg:w-64 shrink-0">
        <div className="card p-3 md:sticky md:top-4">
          <Link href="/" className="px-2 py-2 block" aria-label="Birdie & Cause home">
            <BrandLogo size="sm" />
          </Link>
          <nav className="mt-2 flex flex-col gap-1">
            {links.map((l) => {
              const active =
                pathname === l.href ||
                (l.href !== "/dashboard" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                    active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100",
                  )}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </nav>
          <button
            onClick={logout}
            className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-100 w-full"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
