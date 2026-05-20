"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  BarChart3, Users, Dice5, Heart, Trophy, Home, Menu, X,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/draws", label: "Draws", icon: Dice5 },
  { href: "/admin/charities", label: "Charities", icon: Heart },
  { href: "/admin/winners", label: "Winners", icon: Trophy },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const currentLabel = links.find(
    (l) => l.href === pathname || (l.href !== "/admin" && pathname.startsWith(l.href)),
  )?.label ?? "Reports";

  const Brand = (
    <Link href="/" className="block" aria-label="Birdie & Cause home">
      <span className="inline-flex items-center gap-2">
        <BrandLogo size="sm" iconOnly />
        <span className="font-display font-bold tracking-tight">
          Admin <span className="text-brand-500">Console</span>
        </span>
      </span>
    </Link>
  );

  return (
    <>
      {/* ─── MOBILE TOP BAR ─── */}
      <div className="md:hidden">
        <div className="card p-3 flex items-center justify-between">
          {Brand}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium hover:bg-ink-50"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{currentLabel}</span>
          </button>
        </div>

        {open && (
          <div className="card p-2 mt-2 animate-fade-up">
            <nav className="flex flex-col gap-1">
              {links.map((l) => {
                const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
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
              <Link
                href="/dashboard"
                className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-100"
              >
                <Home className="h-4 w-4" /> Back to dashboard
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden md:block md:w-56 lg:w-64 shrink-0">
        <div className="card p-3 md:sticky md:top-4">
          <div className="px-2 py-2">{Brand}</div>
          <nav className="mt-2 flex flex-col gap-1">
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
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
          </nav>
          <Link
            href="/dashboard"
            className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-100"
          >
            <Home className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </aside>
    </>
  );
}
