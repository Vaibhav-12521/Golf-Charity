import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CharityPicker } from "./picker";

export const dynamic = "force-dynamic";

export default async function CharityPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const supabase = createClient();

  const { data: charities } = await supabase
    .from("charities")
    .select("id, name, slug, tagline, image_url")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Charity</h1>
        <p className="text-ink-600 mt-1">
          Choose which cause receives your contribution. Minimum 10% — set it higher any time.
        </p>
      </header>
      <CharityPicker
        charities={charities || []}
        currentCharityId={session.profile.charity_id || null}
        currentPercent={Number(session.profile.charity_percent)}
      />
    </div>
  );
}
