import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { CharityFilter } from "./filter";

export const dynamic = "force-dynamic";

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("charities").select("*").eq("active", true);

  if (searchParams.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }
  if (searchParams.country) {
    query = query.eq("country", searchParams.country);
  }

  // Parallelise the listing + the distinct-countries lookup for the filter.
  const [{ data: charities }, { data: countryRows }] = await Promise.all([
    query.order("featured", { ascending: false }),
    supabase.from("charities").select("country").eq("active", true),
  ]);
  const countries = Array.from(
    new Set((countryRows || []).map((r) => r.country).filter(Boolean) as string[]),
  ).sort();

  return (
    <>
      <MarketingNav />
      <main className="container-wide py-16 md:py-20">
        <div className="max-w-2xl">
          <span className="badge-brand">Charity directory</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-4">
            Causes you can stand behind.
          </h1>
          <p className="mt-4 text-ink-600">
            Search, filter, and choose any cause. You can switch later from your dashboard.
          </p>
        </div>

        <CharityFilter countries={countries} />

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
          {(charities || []).map((c) => (
            <Link key={c.id} href={`/charities/${c.slug}`} className="card overflow-hidden group">
              {c.image_url && (
                <div className="relative h-48">
                  <Image
                    src={c.image_url}
                    alt={c.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {c.featured && (
                    <span className="absolute top-3 left-3 badge-brand">Spotlight</span>
                  )}
                </div>
              )}
              <div className="p-5">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-ink-500 mt-1 line-clamp-2">{c.tagline}</div>
              </div>
            </Link>
          ))}
          {!charities?.length && (
            <div className="col-span-full card p-10 text-center text-ink-500">
              No charities match your search. Try a different query.
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
