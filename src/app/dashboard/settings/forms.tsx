"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, KeyRound, MailCheck } from "lucide-react";

export function SettingsForms({ initialName, email }: { initialName: string; email: string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 items-stretch">
      <ProfileCard initialName={initialName} />
      <EmailCard currentEmail={email} />
      <PasswordCard />
      <ResetByEmailCard email={email} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ProfileCard({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Profile saved." });
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setMsg({ kind: "err", text: body.error || "Failed to save." });
    }
  }

  return (
    <Card
      icon={<User className="h-4 w-4" />}
      title="Display name"
      subtitle="Used on your dashboard and emails."
    >
      <Body>
        <label className="text-xs font-semibold text-ink-700">Full name</label>
        <input
          className="field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </Body>
      <Footer
        msg={msg}
        action={
          <button onClick={save} disabled={busy || !name.trim()} className="btn-primary">
            {busy ? "Saving..." : "Save"}
          </button>
        }
      />
    </Card>
  );
}

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setEmail("");
    setMsg({
      kind: "ok",
      text: "Confirmation links sent — open the new address to confirm.",
    });
  }

  return (
    <Card
      icon={<Mail className="h-4 w-4" />}
      title="Email"
      subtitle={
        <>
          Current: <span className="font-medium text-ink-700">{currentEmail}</span>
        </>
      }
    >
      <Body>
        <label className="text-xs font-semibold text-ink-700">New email address</label>
        <input
          type="email"
          className="field mt-1"
          placeholder="new@address.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Body>
      <Footer
        msg={msg}
        action={
          <button onClick={save} disabled={busy || !email} className="btn-primary">
            {busy ? "Sending..." : "Send confirmation"}
          </button>
        }
      />
    </Card>
  );
}

function PasswordCard() {
  const supabase = createClient();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setMsg(null);
    if (pw.length < 8) return setMsg({ kind: "err", text: "Min 8 characters." });
    if (pw !== confirm) return setMsg({ kind: "err", text: "Passwords don't match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    setPw("");
    setConfirm("");
    setMsg({ kind: "ok", text: "Password updated." });
  }

  return (
    <Card
      icon={<KeyRound className="h-4 w-4" />}
      title="Password"
      subtitle="Choose a long, unique password."
    >
      <Body>
        <label className="text-xs font-semibold text-ink-700">New password</label>
        <input
          type="password"
          className="field mt-1"
          placeholder="At least 8 characters"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <label className="text-xs font-semibold text-ink-700 mt-3 block">Confirm</label>
        <input
          type="password"
          className="field mt-1"
          placeholder="Re-type new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Body>
      <Footer
        msg={msg}
        action={
          <button onClick={save} disabled={busy || !pw} className="btn-primary">
            {busy ? "Updating..." : "Update password"}
          </button>
        }
      />
    </Card>
  );
}

function ResetByEmailCard({ email }: { email: string }) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function sendReset() {
    setBusy(true);
    setMsg(null);
    const appUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      process.env.NEXT_PUBLIC_APP_URL!;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    setMsg({ kind: "ok", text: "Reset link sent — check your inbox." });
  }

  return (
    <Card
      icon={<MailCheck className="h-4 w-4" />}
      title="Reset password by email"
      subtitle="We'll email a secure link to your current address."
    >
      <Body>
        <div className="rounded-xl bg-ink-50 border border-ink-100 p-3 text-xs text-ink-600">
          A one-time, time-limited link will be sent to <strong>{email}</strong>. Use it
          if you&rsquo;d rather reset your password from your inbox.
        </div>
      </Body>
      <Footer
        msg={msg}
        action={
          <button onClick={sendReset} disabled={busy} className="btn-outline">
            {busy ? "Sending..." : "Email reset link"}
          </button>
        }
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared shell
// ─────────────────────────────────────────────────────────────────────

type Msg = { kind: "ok" | "err"; text: string } | null;

function Card({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 flex flex-col h-full">
      <div className="flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div>
          <div className="font-semibold leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  // Grows so the Footer can be pushed to the bottom across cards of different content sizes.
  return <div className="mt-4 flex-1">{children}</div>;
}

function Footer({ msg, action }: { msg: Msg; action: React.ReactNode }) {
  return (
    <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
      <span
        className={
          msg
            ? `text-xs ${msg.kind === "ok" ? "text-accent-700" : "text-red-600"} flex-1 min-w-0 truncate`
            : "flex-1 min-w-0"
        }
      >
        {msg?.text ?? ""}
      </span>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
