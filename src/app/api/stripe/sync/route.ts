import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, invoicePeriod } from "@/lib/stripe";

/**
 * Manual reconciliation endpoint.
 *
 * Pulls every subscription and paid invoice for the signed-in user's Stripe
 * customer and upserts them into `subscriptions` + `payments` + `donations`.
 * Mirrors the logic of the Stripe webhook but is initiated by the client
 * (used as a fallback when webhooks haven't reached the app — e.g., when
 * running locally without the Stripe CLI listener).
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, charity_id, charity_percent")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Complete a checkout first." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let subsSynced = 0;
  let invoicesSynced = 0;
  let donationsSynced = 0;

  try {
    // ---- Subscriptions ----
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 50,
    });

    for (const sub of subs.data) {
      const item = sub.items.data[0];
      const interval = item?.price?.recurring?.interval;
      const plan: "monthly" | "yearly" = interval === "year" ? "yearly" : "monthly";
      const amount = item?.price?.unit_amount ?? 0;

      const periodStart = (sub as unknown as { current_period_start: number }).current_period_start;
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;

      await admin.from("subscriptions").upsert(
        {
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          user_id: user.id,
          plan,
          status: sub.status,
          current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          amount_cents: amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
      subsSynced++;
    }

    // ---- Paid invoices ----
    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      status: "paid",
      limit: 50,
    });

    for (const invoice of invoices.data) {
      if (!invoice.amount_paid || !invoice.subscription) continue;

      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("stripe_invoice_id", invoice.id)
        .maybeSingle();
      if (existing) continue;

      const { data: subRow } = await admin
        .from("subscriptions")
        .select("id, plan")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .maybeSingle();

      const amount = invoice.amount_paid;
      const percent = Math.max(10, Math.min(100, Number(profile.charity_percent ?? 10)));
      const charityCents = Math.round((amount * percent) / 100);
      const poolCents = amount - charityCents;

      // Use the invoice's billing-period start (line item → invoice period → created).
      // See invoicePeriod() — fixes "Dec invoice paid Jan 1 lands in Jan pool" bug.
      const { periodYear, periodMonth } = invoicePeriod(invoice);

      // Amortize yearly subscriptions across 12 monthly draws (PRD §07 fairness).
      const coverageMonths = subRow?.plan === "yearly" ? 12 : 1;

      await admin.from("payments").insert({
        user_id: user.id,
        subscription_id: subRow?.id ?? null,
        stripe_invoice_id: invoice.id,
        amount_cents: amount,
        charity_amount_cents: charityCents,
        pool_amount_cents: poolCents,
        charity_id: profile.charity_id ?? null,
        period_year: periodYear,
        period_month: periodMonth,
        coverage_months: coverageMonths,
      });
      invoicesSynced++;

      if (profile.charity_id && charityCents > 0) {
        await admin.from("donations").insert({
          user_id: user.id,
          charity_id: profile.charity_id,
          amount_cents: charityCents,
          source: "subscription",
          stripe_payment_intent_id: (invoice.payment_intent as string) || null,
        });
        donationsSynced++;
      }
    }

    return NextResponse.json({
      ok: true,
      subscriptions_synced: subsSynced,
      invoices_synced: invoicesSynced,
      donations_recorded: donationsSynced,
    });
  } catch (e: unknown) {
    console.error("[stripe sync error]", e);
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

