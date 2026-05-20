import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { LoginForm } from "./form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-16 md:py-24 max-w-md">
        <h1 className="font-display text-3xl font-bold">Welcome back.</h1>
        <p className="mt-2 text-ink-600 text-sm">Log in to log scores, switch charity, and check the latest draw.</p>
        <LoginForm next={searchParams.next} />
        <div className="mt-6 flex items-center justify-between text-sm text-ink-500">
          <span>
            New here? <Link href="/signup" className="text-brand-600 font-semibold">Create an account</Link>
          </span>
          <Link href="/forgot-password" className="text-ink-700 hover:underline">Forgot password?</Link>
        </div>
      </main>
    </>
  );
}
