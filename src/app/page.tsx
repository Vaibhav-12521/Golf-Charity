import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ArrowRight, Heart, Sparkles, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  // PRD §08 — "Featured / spotlight charity section on homepage". Plural is
  // implied; render every charity with featured=true, not just the first one.
  const [{ data: featured }, { data: charities }] = await Promise.all([
    supabase
      .from("charities")
      .select("*")
      .eq("active", true)
      .eq("featured", true)
      .order("created_at", { ascending: true })
      .limit(4),
    supabase
      .from("charities")
      .select("id, slug, name, tagline, image_url")
      .eq("active", true)
      .limit(6),
  ]);
  const featuredList = featured || [];

  return (
    <>
      <MarketingNav />
      <main>
        {/* ───── HERO ───── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="hero-orb absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-60" />
            <div className="hero-orb absolute -bottom-60 -right-40 h-[600px] w-[600px] rounded-full opacity-50" />
          </div>
          <div className="container-wide pt-14 pb-16 md:pt-28 md:pb-32">
            <div className="max-w-3xl animate-fade-up">
              <span className="badge-brand mb-6">
                <Sparkles className="h-3.5 w-3.5" /> New · Monthly Charity Draw is live
              </span>
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
                Play a round.
                <br />
                <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 bg-clip-text text-transparent">
                  Change a life.
                </span>
              </h1>
              <p className="mt-5 md:mt-6 text-base sm:text-lg md:text-xl text-ink-600 max-w-2xl">
                A subscription platform where your score-card funds a cause. Submit your last
                five rounds, support the charity you care about, and enter a monthly draw worth
                thousands.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="btn-brand">
                  Subscribe & start playing <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/how-it-works" className="btn-outline">How it works</Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-ink-500">
                <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-brand-500" /> 10% minimum to charity</span>
                <span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-brand-500" /> Monthly jackpot rollover</span>
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-500" /> Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>

        {/* ───── HOW IT WORKS ───── */}
        <section className="container-wide pb-20">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "01", t: "Subscribe", d: "Monthly or yearly — both unlock the platform & all draws." },
              { n: "02", t: "Pick a cause", d: "Choose your charity. Minimum 10% of every payment goes to them." },
              { n: "03", t: "Log 5 scores", d: "Enter your latest five rounds in Stableford (1–45)." },
              { n: "04", t: "Win monthly", d: "Match 3, 4, or all 5 numbers. Jackpot rolls over if unclaimed." },
            ].map((s) => (
              <div key={s.n} className="card p-6">
                <div className="text-xs font-bold tracking-widest text-brand-500">{s.n}</div>
                <div className="mt-3 text-lg font-semibold">{s.t}</div>
                <p className="mt-2 text-sm text-ink-600">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── SPOTLIGHT CHARITIES (plural, per PRD §08) ───── */}
        {featuredList.length > 0 && (
          <section className="container-wide pb-20">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <span className="badge-brand">Spotlight</span>
                <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold">
                  {featuredList.length === 1 ? "This month's featured cause" : "This month's featured causes"}
                </h2>
                <p className="text-ink-600 mt-2">Hand-picked, vetted, ready for your support.</p>
              </div>
            </div>

            {featuredList.length === 1 ? (
              // Single spotlight — large hero-style card.
              <div className="card overflow-hidden md:grid md:grid-cols-2">
                {featuredList[0].hero_url && (
                  <div className="relative h-64 md:h-auto">
                    <Image
                      src={featuredList[0].hero_url}
                      alt={featuredList[0].name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <span className="badge-brand w-fit">Spotlight charity</span>
                  <h3 className="mt-4 font-display text-3xl md:text-4xl font-bold">{featuredList[0].name}</h3>
                  <p className="mt-3 text-ink-600">{featuredList[0].tagline}</p>
                  <p className="mt-2 text-sm text-ink-500">{featuredList[0].description}</p>
                  <div className="mt-6">
                    <Link href={`/charities/${featuredList[0].slug}`} className="btn-primary">
                      Read their story <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              // Multiple spotlights — responsive grid.
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredList.map((c) => (
                  <Link
                    key={c.id}
                    href={`/charities/${c.slug}`}
                    className="card overflow-hidden group hover:shadow-glow transition-shadow"
                  >
                    {c.hero_url && (
                      <div className="relative h-44">
                        <Image
                          src={c.hero_url}
                          alt={c.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 badge-brand">Spotlight</span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="font-display font-bold text-lg">{c.name}</div>
                      <p className="mt-1 text-sm text-ink-600 line-clamp-2">{c.tagline}</p>
                      <div className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 font-semibold">
                        Read their story <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ───── CHARITY GRID ───── */}
        <section className="container-wide pb-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">Who you can support</h2>
              <p className="text-ink-600 mt-2">A growing roster of verified causes. Switch your pick any time.</p>
            </div>
            <Link href="/charities" className="hidden md:inline-flex btn-ghost">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {(charities || []).map((c) => (
              <Link key={c.id} href={`/charities/${c.slug}`} className="card overflow-hidden group">
                {c.image_url && (
                  <div className="relative h-44">
                    <Image src={c.image_url} alt={c.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-ink-500 mt-1">{c.tagline}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ───── BIG CTA ───── */}
        <section className="container-wide pb-24">
          <div className="card p-10 md:p-16 text-center bg-gradient-to-br from-ink-900 to-ink-800 text-white border-0 shadow-card">
            <h2 className="font-display text-4xl md:text-5xl font-bold">Your round just got meaningful.</h2>
            <p className="mt-4 text-ink-200 max-w-2xl mx-auto">
              Subscribe for less than a sleeve of balls. Win up to thousands. Support a cause that
              matters to you — every single month.
            </p>
            <div className="mt-8 inline-flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn-brand">Start subscription</Link>
              <Link href="/charities" className="btn-outline bg-transparent border-white/30 text-white hover:bg-white/10">Browse causes</Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
