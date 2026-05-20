import { NextRequest, NextResponse } from "next/server";
import { getStripe, invoicePeriod } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { POOL_SPLIT } from "@/lib/draw-engine";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — drives subscription lifecycle + payment ledger.
 *
 * Handles:
 *   customer.subscription.created / updated / deleted
 *     -> upserts row in `subscriptions`
 *   invoice.paid
 *     -> records a `payments` row, splits amount into charity vs. pool contribution,
 *        and records a `donations` row for the charity portion.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, secret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return new NextResponse(`Webhook signature error: ${msg}`, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.supabase_user_id as string | undefined) ||
          (await findUserByCustomer(admin, sub.customer as string));
        if (!userId) break;

        const plan: "monthly" | "yearly" =
          (sub.metadata?.plan as "monthly" | "yearly" | undefined) ||
          inferPlan(sub);

        const item = sub.items.data[0];
        const amount = item?.price?.unit_amount ?? 0;

        await admin.from("subscriptions").upsert(
          {
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            user_id: userId,
            plan,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            amount_cents: amount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription || invoice.amount_paid === 0) break;

        const customerId = invoice.customer as string;
        const userId = await findUserByCustomer(admin, customerId);
        if (!userId) break;

        // Already recorded?
        const { data: existing } = await admin
          .from("payments")
          .select("id")
          .eq("stripe_invoice_id", invoice.id)
          .maybeSingle();
        if (existing) break;

        const { data: profile } = await admin
          .from("profiles")
          .select("charity_id, charity_percent")
          .eq("id", userId)
          .maybeSingle();

        const { data: subRow } = await admin
          .from("subscriptions")
          .select("id, plan")
          .eq("stripe_subscription_id", invoice.subscription as string)
          .maybeSingle();

        const amount = invoice.amount_paid;
        const percent = Math.max(10, Math.min(100, Number(profile?.charity_percent ?? 10)));
        const charityCents = Math.round((amount * percent) / 100);
        // The PRD splits 40/35/25 from a fixed portion of the subscription. We treat
        // "everything that isn't going to charity" as the prize-pool contribution.
        const poolCents = amount - charityCents;

        // Attribute the payment to the *billing period it covers*, not wallclock.
        // A Dec invoice that settles on Jan 1 must still count toward December's
        // draw pool. Source of truth: the line-item period (most precise), then
        // the invoice's own period_start, then created as a last resort.
        const { periodYear, periodMonth } = invoicePeriod(invoice);

        // Amortize yearly subscriptions across 12 monthly draws (PRD §07 fairness).
        // Monthly = 1 month. Yearly = 12 months. Charity contributions stay lump-sum.
        const coverageMonths = subRow?.plan === "yearly" ? 12 : 1;

        await admin.from("payments").insert({
          user_id: userId,
          subscription_id: subRow?.id ?? null,
          stripe_invoice_id: invoice.id,
          amount_cents: amount,
          charity_amount_cents: charityCents,
          pool_amount_cents: poolCents,
          charity_id: profile?.charity_id ?? null,
          period_year: periodYear,
          period_month: periodMonth,
          coverage_months: coverageMonths,
        });

        if (profile?.charity_id && charityCents > 0) {
          await admin.from("donations").insert({
            user_id: userId,
            charity_id: profile.charity_id,
            amount_cents: charityCents,
            source: "subscription",
            stripe_payment_intent_id: (invoice.payment_intent as string) || null,
          });
        }
        break;
      }

      default:
        // unhandled events are fine — just acknowledge.
        break;
    }
  } catch (e) {
    console.error("[stripe webhook error]", e);
    return NextResponse.json({ received: true, warning: "handler error" }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}

// Lookup helpers ---------------------------------------------------------

async function findUserByCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

function inferPlan(sub: Stripe.Subscription): "monthly" | "yearly" {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  return interval === "year" ? "yearly" : "monthly";
}

// (POOL_SPLIT import retained for self-documenting reference of the tier math.)
void POOL_SPLIT;
