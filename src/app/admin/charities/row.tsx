"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface C {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  featured: boolean;
}

export function CharityRow({ charity }: { charity: C }) {
  const router = useRouter();
  const [active, setActive] = useState(charity.active);
  const [featured, setFeatured] = useState(charity.featured);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/charities/${charity.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete ${charity.name}?`)) return;
    await fetch(`/api/admin/charities/${charity.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <tr className="border-t border-ink-100">
      <td className="px-4 py-3 font-semibold">{charity.name}</td>
      <td className="text-ink-500">{charity.slug}</td>
      <td>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => { setActive(e.target.checked); patch({ active: e.target.checked }); }}
            disabled={busy}
          />
          Active
        </label>
      </td>
      <td>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => { setFeatured(e.target.checked); patch({ featured: e.target.checked }); }}
            disabled={busy}
          />
          Spotlight
        </label>
      </td>
      <td className="text-right pr-4">
        <Link href={`/admin/charities/${charity.id}`} className="text-brand-600 text-xs font-semibold hover:underline mr-3">Edit</Link>
        <button onClick={remove} className="text-red-600 text-xs font-semibold hover:underline">Delete</button>
      </td>
    </tr>
  );
}
