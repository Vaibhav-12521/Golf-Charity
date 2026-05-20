"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

type Role = "all" | "user" | "admin";
type Status = "all" | "active" | "inactive";

export function UsersToolbar({
  q: initialQ,
  role: initialRole,
  status: initialStatus,
}: {
  q: string;
  role: Role;
  status: Status;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [pending, start] = useTransition();

  function apply(patch: { q?: string; role?: Role; status?: Status }) {
    const sp = new URLSearchParams(params);
    const nextQ = patch.q !== undefined ? patch.q : q;
    const nextRole = patch.role ?? (initialRole === "all" ? undefined : initialRole);
    const nextStatus = patch.status ?? (initialStatus === "all" ? undefined : initialStatus);

    if (nextQ) sp.set("q", nextQ);
    else sp.delete("q");
    if (nextRole && nextRole !== "all") sp.set("role", nextRole);
    else sp.delete("role");
    if (nextStatus && nextStatus !== "all") sp.set("status", nextStatus);
    else sp.delete("status");

    start(() => router.replace(`/admin/users?${sp.toString()}`));
  }

  const hasFilters = initialQ || initialRole !== "all" || initialStatus !== "all";

  return (
    <div className="card p-4 animate-fade-up-200">
      <form
        onSubmit={(e) => { e.preventDefault(); apply({}); }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email..."
            className="field pl-9"
          />
        </div>

        <select
          value={initialRole}
          onChange={(e) => apply({ role: e.target.value as Role })}
          className="field w-auto"
        >
          <option value="all">All roles</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>

        <select
          value={initialStatus}
          onChange={(e) => apply({ status: e.target.value as Status })}
          className="field w-auto"
        >
          <option value="all">All statuses</option>
          <option value="active">Active subscribers</option>
          <option value="inactive">Inactive / lapsed</option>
        </select>

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "..." : "Search"}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              start(() => router.replace("/admin/users"));
            }}
            className="btn-ghost"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </form>
    </div>
  );
}
