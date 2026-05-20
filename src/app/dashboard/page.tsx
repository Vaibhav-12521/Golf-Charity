import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDate, getCurrentPeriod, monthLabel } from "@/lib/utils";
import { isSubscriptionActive } from "@/lib/types";
import {
  Heart, Trophy, ListChecks, CreditCard, Dice5,
  Sparkles, Plus, ChevronRight, Activity, TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function DashboardOverview() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const { user, profile } = session;
  const supabase = createClient();

  const { year, month: curMonth } = getCurrentPeriod();
  const [
    { data: sub },
    { data: scores },
    { data: charity },
    { data: winners },
    { data: nextDraw },
    { data: currentDraw },
    { count: lifetimeEntries },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("played_on", { ascending: false }),
    profile.charity_id
      ? supabase
          .from("charities")
          .select("name, slug, tagline, image_url, mission")
          .eq("id", profile.charity_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("winners").select("prize_cents, status, draw_id, created_at").eq("user_id", user.id),
    supabase
      .from("draws")
      .select("period_year, period_month, status")
      .eq("status", "published")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("draws")
      .select("id, period_year, period_month, status, total_pool_cents, rollover_in_cents")
      .eq("period_year", year)
      .eq("period_month", curMonth)
      .maybeSingle(),
    supabase
      .from("draw_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("payments")
      .select("amount_cents, charity_amount_cents, pool_amount_cents, period_year, period_month, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const active = isSubscriptionActive(sub);
  const month = curMonth;
  const totalWon = (winners || []).reduce((s, w) => s + w.prize_cents, 0);
  const totalPaid = (winners || []).filter((w) => w.status === "paid").reduce((s, w) => s + w.prize_cents, 0);
  const pendingCount = (winners || []).filter((w) =>
    ["pending_proof", "pending_review", "approved"].includes(w.status),
  ).length;

  const firstName = profile.full_name?.split(" ")[0] || "Player";
  const scoreCount = (scores || []).length;
  const charityPercent = Number(profile.charity_percent);

  // ─── Impact numbers ───
  const totalContributed = (payments || []).reduce((s, p) => s + p.charity_amount_cents, 0);
  const totalPoolFunded = (payments || []).reduce((s, p) => s + p.pool_amount_cents, 0);
  const totalSubscribed = (payments || []).reduce((s, p) => s + p.amount_cents, 0);

  // ─── Last 6 months contribution series (for bar chart) ───
  const series: Array<{ label: string; cents: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const cents = (payments || [])
      .filter((p) => p.period_year === y && p.period_month === m)
      .reduce((s, p) => s + p.charity_amount_cents, 0);
    series.push({ label: MONTH_NAMES[m - 1], cents });
  }
  const seriesMax = Math.max(1, ...series.map((s) => s.cents));

  // ─── Sparkline values for scores ───
  const sparkValues = [...(scores || [])].reverse().slice(0, 5).map((s) => s.value);

  // ─── Activity feed (latest events) ───
  type Activity = { kind: "score" | "win" | "payment" | "draw"; ts: string; title: string; meta: string };
  const activities: Activity[] = [];
  for (const s of (scores || []).slice(0, 3)) {
    activities.push({
      kind: "score",
      ts: s.created_at,
      title: `Score logged · ${s.value}`,
      meta: formatDate(s.played_on),
    });
  }
  for (const w of (winners || []).slice(0, 3)) {
    activities.push({
      kind: "win",
      ts: w.created_at,
      title: `Won ${formatCents(w.prize_cents)}`,
      meta: w.status.replace("_", " "),
    });
  }
  for (const p of (payments || []).slice(0, 3)) {
    activities.push({
      kind: "payment",
      ts: p.created_at,
      title: `Payment ${formatCents(p.amount_cents)}`,
      meta: `${formatCents(p.charity_amount_cents)} → charity`,
    });
  }
  activities.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  return (
    <div className="space-y-5">
      {/* ─── HERO IMPACT BANNER ─── */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white p-5 sm:p-6 md:p-7 lg:p-8 animate-fade-up">
        <div className="pointer-events-none absolute inset-0">
          <div
            aria-hidden
            className="absolute -top-32 -left-20 h-72 w-72 rounded-full opacity-50 blur-3xl animate-float"
            style={{ background: "radial-gradient(circle, rgba(53,125,77,0.55), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-10 h-80 w-80 rounded-full opacity-40 blur-3xl animate-float"
            style={{
              background: "radial-gradient(circle, rgba(210,142,12,0.55), transparent 70%)",
              animationDelay: "1.5s",
            }}
          />
        </div>

        <div className="relative z-10 grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-brand-300" />
              {greeting()} · {monthLabel(year, month)}
            </div>
            <h1 className="mt-4 font-display text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
              Hello, {firstName}.
            </h1>
            <p className="mt-2 text-ink-200 max-w-lg">
              {active
                ? "Your subscription is live. Every payment funds a cause and enters you in the monthly draw."
                : "Activate your subscription to enter this month's draw and start supporting your chosen charity."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {active ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-500/20 border border-accent-400/40 px-3 py-1 text-xs font-semibold text-accent-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent-300 opacity-75 animate-pulse-ring" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-300" />
                  </span>
                  Subscription Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-200">
                  Subscription inactive
                </span>
              )}
              {sub?.current_period_end && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Renews {formatDate(sub.current_period_end)}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!active ? (
                <Link href="/dashboard/subscription" className="btn-brand">
                  <CreditCard className="h-4 w-4" /> Activate now
                </Link>
              ) : (
                <Link
                  href="/dashboard/scores"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-ink-900 px-5 py-2.5 text-sm font-semibold shadow-card hover:shadow-glow transition-shadow"
                >
                  <Plus className="h-4 w-4" /> Log a score
                </Link>
              )}
              <Link
                href="/dashboard/draws"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Dice5 className="h-4 w-4" /> See latest draw
              </Link>
            </div>
          </div>

          {/* Impact callout */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-5 md:p-6">
            <div className="text-[11px] sm:text-xs uppercase font-semibold tracking-wider text-ink-300">Your impact this lifetime</div>
            <div className="mt-2 font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-none tracking-tight break-all">
              {formatCents(totalContributed)}
            </div>
            <p className="mt-2 text-sm text-ink-300">
              Routed to {charity?.name || "your selected charity"} · {charityPercent}% of every payment.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-300">Subscribed</div>
                <div className="mt-0.5 font-bold tabular-nums">{formatCents(totalSubscribed)}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-300">Pool funded</div>
                <div className="mt-0.5 font-bold tabular-nums">{formatCents(totalPoolFunded)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ROW ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          delay="animate-fade-up"
          icon={<Activity className="h-4 w-4" />}
          label="Subscription"
          value={active ? "Active" : "Inactive"}
          sub={sub?.current_period_end ? `Until ${formatDate(sub.current_period_end)}` : "—"}
          tone={active ? "green" : "muted"}
        />
        <StatCard
          delay="animate-fade-up-200"
          icon={<ListChecks className="h-4 w-4" />}
          label="Scores logged"
          value={`${scoreCount} / 5`}
          sub={scores?.[0] ? `Latest ${formatDate(scores[0].played_on)}` : "Add your first"}
          tone={scoreCount === 5 ? "green" : scoreCount > 0 ? "brand" : "muted"}
          progress={(scoreCount / 5) * 100}
        />
        <StatCard
          delay="animate-fade-up-300"
          icon={<Trophy className="h-4 w-4" />}
          label="Total won"
          value={formatCents(totalWon)}
          sub={
            pendingCount > 0
              ? `${pendingCount} payout${pendingCount === 1 ? "" : "s"} pending`
              : `${formatCents(totalPaid)} paid out`
          }
          tone={totalWon > 0 ? "brand" : "muted"}
        />
        <StatCard
          delay="animate-fade-up-400"
          icon={<Heart className="h-4 w-4" />}
          label="Charity share"
          value={`${charityPercent}%`}
          sub={charity?.name || "Pick a charity"}
          tone="brand"
          progress={charityPercent}
        />
      </section>

      {/* ─── MAIN GRID — 2/3 + 1/3 ─── */}
      <section className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Left column: chart + recent activity */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contribution trend */}
          <div className="card p-5 animate-fade-up-300">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-ink-400">
                  <TrendingUp className="h-3.5 w-3.5" /> Contribution trend
                </div>
                <h2 className="font-display text-xl font-bold mt-1">Last 6 months to charity</h2>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-400">Total</div>
                <div className="font-display text-2xl font-bold tabular-nums">{formatCents(totalContributed)}</div>
              </div>
            </div>
            <BarChart series={series} max={seriesMax} />
          </div>

          {/* Recent activity */}
          <div className="card p-5 animate-fade-up-400">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Recent activity</h2>
              <span className="text-xs text-ink-400">{activities.length} events</span>
            </div>
            <ul className="mt-4 space-y-3">
              {activities.length === 0 && (
                <li className="text-sm text-ink-400">
                  No activity yet — log a score or activate your subscription to get started.
                </li>
              )}
              {activities.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <ActivityIcon kind={a.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{a.title}</div>
                    <div className="text-xs text-ink-500 truncate">{a.meta}</div>
                  </div>
                  <div className="text-xs text-ink-400 whitespace-nowrap">{formatDate(a.ts)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column: charity panel + scores + upcoming draw */}
        <div className="space-y-5">
          {/* Charity impact panel */}
          <Link
            href="/dashboard/charity"
            className="card p-5 block hover:shadow-glow transition-all duration-300 group animate-fade-up-200 relative overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-25 blur-2xl bg-gradient-to-br from-brand-500 to-accent-500"
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink-700">
                  <span className="h-9 w-9 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
                    <Heart className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">Your cause</span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
              </div>
              <div className="mt-5 flex items-center gap-4">
                <ProgressRing percent={charityPercent} />
                <div className="min-w-0">
                  <div className="font-display text-lg font-bold truncate">
                    {charity?.name || "Pick a charity"}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">
                    {charity?.tagline || "Choose any cause from the directory."}
                  </p>
                </div>
              </div>
              {charity?.mission && (
                <div className="mt-4 rounded-xl bg-accent-50 p-3 text-xs text-accent-800">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-accent-600 mb-1">
                    Mission
                  </div>
                  <div className="line-clamp-2">{charity.mission}</div>
                </div>
              )}
            </div>
          </Link>

          {/* Score card */}
          <Link
            href="/dashboard/scores"
            className="card p-5 block hover:shadow-glow transition-all duration-300 group animate-fade-up-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink-700">
                <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <ListChecks className="h-4 w-4" />
                </span>
                <span className="font-semibold">Last 5 scores</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
            </div>
            {sparkValues.length > 0 ? (
              <>
                <Sparkline values={sparkValues} />
                <ul className="mt-3 space-y-1 text-xs">
                  {scores!.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span className="text-ink-500">{formatDate(s.played_on)}</span>
                      <span className="font-semibold tabular-nums">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-500">
                No scores yet — log one to enter this month&rsquo;s draw.
              </p>
            )}
          </Link>

          {/* Upcoming draw */}
          <Link
            href="/dashboard/draws"
            className="card p-5 block hover:shadow-glow transition-all duration-300 group animate-fade-up-400"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink-700">
                <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Dice5 className="h-4 w-4" />
                </span>
                <span className="font-semibold">Upcoming draw</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-300 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
            </div>
            <div className="mt-4">
              <div className="font-display text-xl font-bold">{monthLabel(year, month)}</div>
              <div className="mt-1 text-sm">
                {!currentDraw && <span className="text-ink-500">Not yet scheduled.</span>}
                {currentDraw?.status === "draft" && (
                  <span className="text-ink-500">Scheduled — awaiting run.</span>
                )}
                {currentDraw?.status === "simulated" && (
                  <span className="text-amber-700">Ran in preview — awaiting publish.</span>
                )}
                {currentDraw?.status === "published" && (
                  <span className="inline-flex items-center gap-1 text-accent-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
                    </span>
                    Results published
                  </span>
                )}
              </div>
            </div>
            {currentDraw && (
              <div className="mt-3 rounded-xl bg-ink-50 p-3">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                  Pool so far
                </div>
                <div className="font-display text-lg font-bold tabular-nums">
                  {formatCents((currentDraw.total_pool_cents || 0) + (currentDraw.rollover_in_cents || 0))}
                </div>
              </div>
            )}
            <div className="mt-3 text-xs text-ink-500">
              Entries lifetime: <strong className="text-ink-900">{lifetimeEntries ?? 0}</strong>
              {nextDraw && (
                <> · Latest published: <strong className="text-ink-900">{monthLabel(nextDraw.period_year, nextDraw.period_month)}</strong></>
              )}
            </div>
          </Link>
        </div>
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      <section className="animate-fade-up-500">
        <div className="text-xs uppercase font-semibold tracking-wider text-ink-400 mb-3">
          Quick actions
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/dashboard/scores" label="Log a score" icon={<Plus className="h-4 w-4" />} />
          <QuickAction href="/dashboard/charity" label="Switch charity" icon={<Heart className="h-4 w-4" />} />
          <QuickAction href="/dashboard/winnings" label="Upload winner proof" icon={<Trophy className="h-4 w-4" />} />
          <QuickAction href="/dashboard/subscription" label="Manage billing" icon={<CreditCard className="h-4 w-4" />} />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, tone = "muted", progress, delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "brand" | "muted";
  progress?: number;
  delay?: string;
}) {
  const accent = {
    green: "from-accent-500 to-accent-400",
    brand: "from-brand-500 to-brand-400",
    muted: "from-ink-400 to-ink-300",
  }[tone];
  return (
    <div className={`card p-4 ${delay || ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-ink-400">
        <span className="h-7 w-7 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-display font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function QuickAction({
  href, label, icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-xl bg-white border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 220, h = 56, padX = 4, padY = 6, min = 0, max = 45;
  const dx = (w - padX * 2) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = padX + i * dx;
    const norm = (v - min) / (max - min);
    const y = padY + (1 - norm) * (h - padY * 2);
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const areaPath = `${path} L ${padX + dx * (values.length - 1)} ${h} L ${padX} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full h-14">
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(53,125,77,0.35)" />
          <stop offset="100%" stopColor="rgba(53,125,77,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-area)" />
      <path d={path} fill="none" stroke="#357d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (<circle key={i} cx={x} cy={y} r={2.5} fill="#357d4d" />))}
    </svg>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="rotate-[-90deg]">
        <circle cx="38" cy="38" r={r} stroke="#e9ecf4" strokeWidth="6" fill="none" />
        <circle
          cx="38"
          cy="38"
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.215, 0.61, 0.355, 1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#357d4d" />
            <stop offset="100%" stopColor="#d28e0c" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-display text-sm font-bold tabular-nums">
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}

function BarChart({ series, max }: { series: Array<{ label: string; cents: number }>; max: number }) {
  return (
    <div className="mt-6 grid grid-cols-6 gap-1.5 sm:gap-3 items-end h-36 sm:h-40">
      {series.map((s, i) => {
        const h = max > 0 ? (s.cents / max) * 100 : 0;
        return (
          <div key={i} className="flex flex-col items-center justify-end gap-1.5 sm:gap-2 h-full min-w-0">
            <div className="text-[9px] sm:text-[10px] font-semibold tabular-nums text-ink-500 truncate w-full text-center">
              {s.cents > 0 ? formatCents(s.cents) : "—"}
            </div>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-300 shadow-sm transition-all duration-700"
              style={{ height: `${Math.max(2, h)}%`, animationDelay: `${i * 80}ms` }}
            />
            <div className="text-[10px] sm:text-[11px] font-semibold text-ink-500">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityIcon({ kind }: { kind: "score" | "win" | "payment" | "draw" }) {
  const map = {
    score: { icon: <ListChecks className="h-4 w-4" />, tone: "bg-brand-50 text-brand-600" },
    win: { icon: <Trophy className="h-4 w-4" />, tone: "bg-amber-50 text-amber-600" },
    payment: { icon: <CreditCard className="h-4 w-4" />, tone: "bg-accent-50 text-accent-600" },
    draw: { icon: <Dice5 className="h-4 w-4" />, tone: "bg-ink-100 text-ink-600" },
  };
  const { icon, tone } = map[kind];
  return (
    <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
      {icon}
    </span>
  );
}
