import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { formatDate } from "@/lib/utils";
import { DonateForm } from "./donate-form";

export const dynamic = "force-dynamic";

export default async function CharityProfile({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: charity, error } = await supabase
    .from("charities")
    .select("*")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("[charity-profile] supabase error", { slug: params.slug, error });
  }
  if (!charity) notFound();

  // Events depend on the charity id, so this has to come after.
  const { data: events } = await supabase
    .from("charity_events")
    .select("*")
    .eq("charity_id", charity.id)
    .order("event_date", { ascending: true });

  return (
    <>
      <MarketingNav />
      <main>
        <section className="relative">
          {charity.hero_url && (
            <div className="relative h-72 md:h-96">
              <Image src={charity.hero_url} alt={charity.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
            </div>
          )}
          <div className="container-narrow -mt-24 relative">
            <div className="card p-8 md:p-10">
              {charity.featured && <span className="badge-brand">Spotlight charity</span>}
              <h1 className="font-display text-3xl md:text-5xl font-bold mt-3">{charity.name}</h1>
              <p className="text-lg text-ink-600 mt-3">{charity.tagline}</p>
              {charity.description && <p className="mt-5 text-ink-700">{charity.description}</p>}
              {charity.mission && (
                <div className="mt-6 rounded-xl bg-ink-50 p-5">
                  <div className="text-xs font-semibold tracking-widest text-brand-500">MISSION</div>
                  <p className="mt-1 font-semibold">{charity.mission}</p>
                </div>
              )}
              {charity.website && (
                <a
                  href={charity.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex text-sm text-brand-600 hover:underline"
                >
                  Visit website →
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="container-narrow mt-12 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-display text-2xl font-bold">Upcoming events</h2>
            {events && events.length > 0 ? (
              events.map((e) => (
                <div key={e.id} className="card p-5 flex gap-4">
                  {e.image_url && (
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
                      <Image src={e.image_url} alt={e.title} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-sm text-ink-500">
                      {formatDate(e.event_date)} {e.location ? `· ${e.location}` : ""}
                    </div>
                    {e.description && <p className="text-sm mt-2 text-ink-700">{e.description}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="card p-6 text-ink-500 text-sm">No upcoming events yet.</div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="card p-6">
              <div className="text-sm font-semibold">Support this charity</div>
              <p className="text-sm text-ink-500 mt-1">
                Subscribe to enter the monthly draw with 10–100% of every payment going to {charity.name}.
              </p>
              <Link href={`/signup?charity=${charity.slug}`} className="btn-brand mt-4 w-full justify-center">
                Subscribe & support
              </Link>
            </div>

            <div className="card p-6">
              <div className="text-sm font-semibold">Donate directly</div>
              <p className="text-sm text-ink-500 mt-1">No subscription required.</p>
              <DonateForm charityId={charity.id} />
            </div>
          </aside>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
