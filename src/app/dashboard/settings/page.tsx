import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SettingsForms } from "./forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-ink-600 mt-1">Manage your profile and account credentials.</p>
      </header>

      <SettingsForms
        initialName={session.profile.full_name || ""}
        email={session.profile.email}
      />
    </div>
  );
}
