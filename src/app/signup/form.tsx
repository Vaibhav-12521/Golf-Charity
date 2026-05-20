"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Charity {
  id: string;
  slug: string;
  name: string;
}

export function SignupForm({
  charities,
  defaultCharitySlug,
  defaultPlan,
}: {
  charities: Charity[];
  defaultCharitySlug?: string;
  defaultPlan?: "monthly" | "yearly";
}) {
  const router = useRouter();
  const supabase = createClient();
  const defaultCharity = defaultCharitySlug
    ? charities.find((c) => c.slug === defaultCharitySlug)?.id
    : charities[0]?.id;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charityId, setCharityId] = useState(defaultCharity || "");
  const [percent, setPercent] = useState(10);
  const [plan, setPlan] = useState<"monthly" | "yearly">(defaultPlan || "monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Charity selection + percent are passed in user metadata so the
    // handle_new_user() DB trigger writes them straight into profiles —
    // works whether or not email confirmation is enabled. Previously we
    // PATCHed /api/profile after sign-up, which 401'd whenever Supabase
    // didn't return an immediate session (e.g., email confirmation ON),
    // silently dropping the user's charity selection.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          charity_id: charityId,
          charity_percent: percent,
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      // Email confirmation is ON. The trigger already saved the profile
      // (charity included) — nothing more we can do until the user clicks
      // the confirmation link.
      setError("Check your email to confirm your address, then log in.");
      setLoading(false);
      return;
    }

    // Best-effort: a logged-in PATCH only succeeds when we already have a
    // session, so this is now a no-op if email confirmation is on — and
    // a defensive backup if the trigger ever fails to apply metadata.
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ charity_id: charityId, charity_percent: percent }),
    }).catch(() => {});

    // Fire-and-forget welcome email (silent no-op if Resend isn't configured).
    fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});

    // 3. Kick off Stripe checkout for the chosen plan.
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Could not start checkout — log in and try from your dashboard.");
      router.push("/dashboard");
      return;
    }
    if (body.url) {
      window.location.href = body.url;
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-700">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-700">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" required />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-700">Password</label>
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mt-1"
          required
        />
        <p className="text-[11px] text-ink-400 mt-1">Minimum 8 characters.</p>
      </div>

      <div className="card p-5 bg-ink-50 border-ink-100">
        <div className="text-sm font-semibold">Pick a charity</div>
        <p className="text-xs text-ink-500 mt-1">
          Minimum 10% of every payment goes to your selected charity. You can switch any time.
        </p>
        <select value={charityId} onChange={(e) => setCharityId(e.target.value)} className="field mt-3" required>
          {charities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-ink-700 mt-4 block">
          Your contribution: <span className="text-brand-600 font-bold">{percent}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={percent}
          onChange={(e) => setPercent(parseInt(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Plan</div>
        <div className="grid grid-cols-2 gap-3">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPlan(p)}
              className={`rounded-xl border p-4 text-left transition ${
                plan === p
                  ? "border-brand-500 bg-brand-50 shadow-glow"
                  : "border-ink-200 bg-white"
              }`}
            >
              <div className="font-semibold capitalize">{p}</div>
              <div className="text-xs text-ink-500 mt-0.5">
                {p === "monthly" ? "Billed monthly" : "Best value · billed yearly"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={loading} className="btn-brand w-full justify-center">
        {loading ? "Setting up..." : "Continue to checkout"}
      </button>
    </form>
  );
}
