import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { UserRow } from "./row";
import { UsersToolbar } from "./toolbar";
import { Users as UsersIcon, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

interface Search {
  q?: string;
  role?: "user" | "admin";
  status?: "active" | "inactive" | "all";
}

interface SubRow {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  updated_at: string;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Search }) {
  const admin = createAdminClient();

  // 1) Profiles query (with charity name embedded — that FK works).
  let profilesQ = admin
    .from("profiles")
    .select("*, charities:charity_id(name)")
    .order("created_at", { ascending: false });

  if (searchParams.q) {
    const q = searchParams.q;
    profilesQ = profilesQ.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }
  if (searchParams.role === "admin" || searchParams.role === "user") {
    profilesQ = profilesQ.eq("role", searchParams.role);
  }

  // 2) Subscriptions fetched separately — the profiles→subscriptions PostgREST
  //    embed fails because both reference auth.users (not each other), and
  //    PostgREST won't traverse the FK through the auth schema.
  const [{ data: profilesRaw, error: profilesErr }, { data: allSubs }, totals] = await Promise.all([
    profilesQ,
    admin
      .from("subscriptions")
      .select("user_id, plan, status, current_period_end, updated_at")
      .order("updated_at", { ascending: false }),
    Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      admin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
    ]),
  ]);

  if (profilesErr) console.error("[admin/users] profiles query failed:", profilesErr);

  const [{ count: totalUsers }, { count: totalAdmins }, { count: activeSubs }] = totals;

  // 3) Bucket subscriptions by user_id; pick the most-recently-updated per user
  //    (allSubs is already sorted DESC, so first occurrence wins).
  const latestSubByUser = new Map<string, SubRow>();
  for (const s of (allSubs || []) as SubRow[]) {
    if (!latestSubByUser.has(s.user_id)) latestSubByUser.set(s.user_id, s);
  }

  const profiles = (profilesRaw || []).map((p) => ({
    ...p,
    latest_sub: latestSubByUser.get(p.id) ?? null,
  }));

  // 4) Status filter is applied after the JS join.
  const filtered =
    searchParams.status === "active"
      ? profiles.filter((p) => p.latest_sub && ["active", "trialing"].includes(p.latest_sub.status))
      : searchParams.status === "inactive"
        ? profiles.filter((p) => !p.latest_sub || !["active", "trialing"].includes(p.latest_sub.status))
        : profiles;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-ink-600 mt-1">Manage subscribers, scores, charity selections, and roles.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up-200">
        <Stat icon={<UsersIcon className="h-4 w-4" />} label="Total users" value={String(totalUsers ?? 0)} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Active subscriptions" value={String(activeSubs ?? 0)} tone="brand" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Admins" value={String(totalAdmins ?? 0)} tone="green" />
        <Stat
          icon={<UsersIcon className="h-4 w-4" />}
          label="Showing"
          value={`${filtered.length}`}
          sub={
            searchParams.q || searchParams.role || (searchParams.status && searchParams.status !== "all")
              ? "filtered"
              : "all users"
          }
        />
      </div>

      <UsersToolbar
        q={searchParams.q ?? ""}
        role={searchParams.role ?? "all"}
        status={searchParams.status ?? "all"}
      />

      <div className="card p-0 overflow-x-auto animate-fade-up-300">
        <table className="w-full text-sm">
          <thead className="bg-ink-50">
            <tr className="text-left text-ink-600">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="font-semibold">Charity</th>
              <th className="font-semibold">Subscription</th>
              <th className="font-semibold">Renews</th>
              <th className="font-semibold">Role</th>
              <th className="font-semibold">Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-400">
                  No users match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <UserRow
                key={p.id}
                user={{
                  id: p.id,
                  email: p.email,
                  full_name: p.full_name,
                  role: p.role,
                  charity_name: (p.charities as { name: string } | null)?.name ?? null,
                  subscription: p.latest_sub
                    ? {
                        plan: p.latest_sub.plan,
                        status: p.latest_sub.status,
                        renews: p.latest_sub.current_period_end,
                      }
                    : null,
                  joined: formatDate(p.created_at),
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  icon, label, value, sub, tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "muted" | "brand" | "green";
}) {
  const chip = {
    muted: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-600",
    green: "bg-accent-50 text-accent-600",
  }[tone];
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-ink-400">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${chip}`}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-display font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
