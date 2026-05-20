"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface C { id: string; slug: string; name: string; tagline: string | null; image_url: string | null }

export function CharityPicker({
  charities,
  currentCharityId,
  currentPercent,
}: {
  charities: C[];
  currentCharityId: string | null;
  currentPercent: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(currentCharityId || charities[0]?.id || "");
  const [percent, setPercent] = useState(currentPercent || 10);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ charity_id: selectedId, charity_percent: percent }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(new Date());
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="text-sm font-semibold">Your contribution</div>
        <p className="text-xs text-ink-500 mt-1">
          {percent}% of every payment goes to the charity you select.
        </p>
        <input
          type="range"
          min={10}
          max={100}
          value={percent}
          onChange={(e) => setPercent(parseInt(e.target.value))}
          className="mt-3 w-full accent-brand-500"
        />
        <div className="flex justify-between text-[11px] text-ink-400 mt-1">
          <span>10%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {charities.map((c) => {
          const active = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`card overflow-hidden text-left transition relative ${
                active ? "ring-2 ring-brand-500 shadow-glow" : ""
              }`}
            >
              {c.image_url && (
                <div className="relative h-32">
                  <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-ink-500 mt-1 line-clamp-2">{c.tagline}</div>
              </div>
              {active && (
                <span className="absolute top-3 right-3 h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-4">
        <div className="card p-4 flex items-center justify-between">
          <div className="text-sm text-ink-600">
            {savedAt ? <>Saved at {savedAt.toLocaleTimeString()}</> : "Click save to apply your selection"}
          </div>
          <button onClick={save} disabled={saving || !selectedId} className="btn-brand">
            {saving ? "Saving..." : "Save selection"}
          </button>
        </div>
      </div>
    </div>
  );
}
