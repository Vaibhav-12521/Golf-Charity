"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ChevronRight, ShieldCheck } from "lucide-react";

interface U {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  charity_name: string | null;
  subscription: { plan: string; status: string; renews: string | null } | null;
  joined: string;
}

function statusBadge(status: string) {
  if (["active", "trialing"].includes(status)) return "bg-accent-100 text-accent-700";
  if (["canceled", "incomplete_expired"].includes(status)) return "bg-ink-100 text-ink-600";
  if (["past_due", "unpaid"].includes(status)) return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export function UserRow({ user }: { user: U }) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(value: string) {
    const previous = role;
    setBusy(true);
    setError(null);
    setRole(value);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Role update failed");
      }
      router.refresh();
    } catch (e: unknown) {
      setRole(previous);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const initials = (user.full_name || user.email)
    .split(/\s+|@/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="border-t border-ink-100 hover:bg-ink-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate flex items-center gap-1.5">
              {user.full_name || "—"}
              {role === "admin" && <ShieldCheck className="h-3.5 w-3.5 text-brand-500 shrink-0" />}
            </div>
            <div className="text-xs text-ink-500 truncate">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="text-ink-700">{user.charity_name || <span className="text-ink-400">—</span>}</td>
      <td>
        {user.subscription ? (
          <div className="flex flex-col gap-0.5">
            <span className="capitalize font-semibold">{user.subscription.plan}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${statusBadge(user.subscription.status)}`}>
              {user.subscription.status.replace("_", " ")}
            </span>
          </div>
        ) : (
          <span className="text-ink-400">None</span>
        )}
      </td>
      <td className="text-ink-500 text-xs">
        {user.subscription?.renews ? formatDate(user.subscription.renews) : "—"}
      </td>
      <td>
        <select
          value={role}
          onChange={(e) => changeRole(e.target.value)}
          disabled={busy}
          className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs hover:border-brand-300 transition-colors disabled:opacity-60"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        {error && <div className="text-[10px] text-red-600 mt-1 max-w-[120px]">{error}</div>}
      </td>
      <td className="text-ink-500 text-xs whitespace-nowrap">{user.joined}</td>
      <td className="pr-4">
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex items-center gap-1 text-brand-600 font-semibold text-xs hover:underline"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}
