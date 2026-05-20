"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const appUrl = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 card p-5 bg-accent-50 text-accent-900 text-sm">
        Check your inbox. If an account exists for <strong>{email}</strong>, a reset link is on its way.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="text-xs font-semibold text-ink-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1"
          required
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={loading} className="btn-brand w-full justify-center">
        {loading ? "Sending..." : "Email me a reset link"}
      </button>
    </form>
  );
}
