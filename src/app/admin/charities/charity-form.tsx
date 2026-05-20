"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";

interface Initial {
  id?: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  mission: string;
  image_url: string;
  hero_url: string;
  website: string;
  country: string;
  featured: boolean;
  active: boolean;
}

const empty: Initial = {
  name: "", slug: "", tagline: "", description: "", mission: "",
  image_url: "", hero_url: "", website: "", country: "Global",
  featured: false, active: true,
};

export function CharityForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [c, setC] = useState<Initial>(initial || empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...c, slug: c.slug || slugify(c.name) };
    const url = initial?.id ? `/api/admin/charities/${initial.id}` : "/api/admin/charities";
    const method = initial?.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Failed");
    router.push("/admin/charities");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 max-w-2xl">
      <Field label="Name" required>
        <input className="field" value={c.name} onChange={(e) => update("name", e.target.value)} required />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Slug">
          <input className="field" value={c.slug} onChange={(e) => update("slug", e.target.value)} placeholder="auto from name" />
        </Field>
        <Field label="Country">
          <input className="field" value={c.country} onChange={(e) => update("country", e.target.value)} />
        </Field>
      </div>
      <Field label="Tagline">
        <input className="field" value={c.tagline} onChange={(e) => update("tagline", e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea className="field" rows={3} value={c.description} onChange={(e) => update("description", e.target.value)} />
      </Field>
      <Field label="Mission">
        <textarea className="field" rows={2} value={c.mission} onChange={(e) => update("mission", e.target.value)} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Card image URL">
          <input className="field" value={c.image_url} onChange={(e) => update("image_url", e.target.value)} />
        </Field>
        <Field label="Hero image URL">
          <input className="field" value={c.hero_url} onChange={(e) => update("hero_url", e.target.value)} />
        </Field>
      </div>
      <Field label="Website">
        <input className="field" value={c.website} onChange={(e) => update("website", e.target.value)} />
      </Field>

      <div className="flex gap-6">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={c.active} onChange={(e) => update("active", e.target.checked)} />
          Active
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={c.featured} onChange={(e) => update("featured", e.target.checked)} />
          Spotlight on homepage
        </label>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button disabled={busy} className="btn-brand">
        {busy ? "Saving..." : initial?.id ? "Save changes" : "Create charity"}
      </button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-700">{label}{required && " *"}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
