import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");

  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-24 max-w-md">
        <h1 className="font-display text-3xl font-bold">Set a new password.</h1>
        <p className="mt-2 text-ink-600 text-sm">
          You&rsquo;re signed in via the reset link. Pick a fresh password to finish.
        </p>
        <ResetForm />
      </main>
    </>
  );
}
