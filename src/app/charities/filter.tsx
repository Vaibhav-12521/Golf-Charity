"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

export function CharityFilter({ countries }: { countries: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [country, setCountry] = useState(params.get("country") || "");
  const [pending, start] = useTransition();

  function apply(nextQ: string, nextCountry: string) {
    const sp = new URLSearchParams(params);
    if (nextQ) sp.set("q", nextQ); else sp.delete("q");
    if (nextCountry) sp.set("country", nextCountry); else sp.delete("country");
    start(() => router.replace(`/charities?${sp.toString()}`));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    apply(q, country);
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name..."
          className="field pl-9"
        />
      </div>
      {countries.length > 0 && (
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); apply(q, e.target.value); }}
          className="field w-auto"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "..." : "Search"}
      </button>
      {(q || country) && (
        <button
          type="button"
          onClick={() => { setQ(""); setCountry(""); apply("", ""); }}
          className="btn-ghost"
        >
          Clear
        </button>
      )}
    </form>
  );
}
