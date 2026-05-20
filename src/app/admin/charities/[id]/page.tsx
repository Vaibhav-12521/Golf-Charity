import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CharityForm } from "../charity-form";

export const dynamic = "force-dynamic";

export default async function EditCharityPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("charities").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Edit charity</h1>
      </header>
      <CharityForm
        initial={{
          id: data.id,
          name: data.name,
          slug: data.slug,
          tagline: data.tagline || "",
          description: data.description || "",
          mission: data.mission || "",
          image_url: data.image_url || "",
          hero_url: data.hero_url || "",
          website: data.website || "",
          country: data.country || "",
          featured: !!data.featured,
          active: !!data.active,
        }}
      />
    </div>
  );
}
