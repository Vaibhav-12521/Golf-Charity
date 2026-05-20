import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { SignupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { plan?: "monthly" | "yearly"; charity?: string };
}) {
  const supabase = createClient();
  const { data: charities } = await supabase
    .from("charities")
    .select("id, slug, name")
    .eq("active", true)
    .order("name");

  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-20 max-w-xl">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Create your account.</h1>
        <p className="mt-2 text-ink-600 text-sm">
          One minute to set up. You&rsquo;ll be entered in the next draw the moment your subscription clears.
        </p>
        <SignupForm
          charities={charities || []}
          defaultCharitySlug={searchParams.charity}
          defaultPlan={searchParams.plan}
        />
        <p className="mt-6 text-sm text-ink-500">
          Already have an account? <Link href="/login" className="text-brand-600 font-semibold">Log in</Link>
        </p>
      </main>
    </>
  );
}
