import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { ForgotForm } from "./form";

export default function ForgotPasswordPage() {
  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-24 max-w-md">
        <h1 className="font-display text-3xl font-bold">Reset your password.</h1>
        <p className="mt-2 text-ink-600 text-sm">
          Enter your email and we&rsquo;ll send a link to reset your password.
        </p>
        <ForgotForm />
        <p className="mt-6 text-sm text-ink-500">
          Remembered it? <Link href="/login" className="text-brand-600 font-semibold">Log in</Link>
        </p>
      </main>
    </>
  );
}
