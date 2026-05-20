import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";

export default function NotFound() {
  return (
    <>
      <MarketingNav />
      <main className="container-narrow py-24 text-center">
        <span className="badge-brand">404</span>
        <h1 className="font-display text-4xl font-bold mt-3">Lost the trail.</h1>
        <p className="mt-3 text-ink-600">We couldn&rsquo;t find what you&rsquo;re looking for.</p>
        <Link href="/" className="btn-brand mt-6">Back home</Link>
      </main>
    </>
  );
}
