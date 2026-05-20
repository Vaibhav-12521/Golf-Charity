"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetForm() {
  const router = useRouter();
  const supabase = createClient();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="text-xs font-semibold text-ink-700">New password</label>
        <input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="field mt-1" required />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-700">Confirm password</label>
        <input type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field mt-1" required />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={loading} className="btn-brand w-full justify-center">
        {loading ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}
