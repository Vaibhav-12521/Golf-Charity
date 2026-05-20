import { z } from "zod";

/**
 * Boot-time env validation.
 *
 * Why: a missing `STRIPE_SECRET_KEY` (or any other critical var) used to only
 * surface on the first user-triggered checkout. By the time the error fired,
 * the user was halfway through a flow. We now validate at server start so
 * misconfiguration fails loud, fast, and *before* any traffic hits the app.
 *
 * Variables split into three groups:
 *   - publicVars   exposed to the browser (NEXT_PUBLIC_*); must be present
 *                  at build time so Next can inline them.
 *   - serverVars   only present at runtime on the server.
 *   - optionalVars features that degrade gracefully when absent (Resend,
 *                  Stripe webhook secret prior to deploy, etc.).
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_PRICE_MONTHLY: z.string().startsWith("price_"),
  STRIPE_PRICE_YEARLY: z.string().startsWith("price_"),
  ADMIN_EMAILS: z.string().min(3), // comma-separated email list
});

const optionalSchema = z.object({
  // Webhook secret is only required *after* deploy + Stripe webhook setup.
  // We validate the prefix when present but don't require it.
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional().or(z.literal("")),
  RESEND_API_KEY: z.string().startsWith("re_").optional().or(z.literal("")),
  EMAIL_FROM: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional().or(z.literal("")),
  SUBSCRIPTION_PRICE_MONTHLY_CENTS: z.string().regex(/^\d+$/).optional(),
  SUBSCRIPTION_PRICE_YEARLY_CENTS: z.string().regex(/^\d+$/).optional(),
});

const fullSchema = publicSchema.merge(serverSchema).merge(optionalSchema);

function format(issues: z.ZodIssue[]): string {
  return issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
}

/**
 * Validate env. Throws a single readable error listing every missing or
 * malformed variable, so misconfiguration is fixed in one round-trip rather
 * than discovered one var at a time.
 */
export function validateEnv() {
  const result = fullSchema.safeParse(process.env);
  if (!result.success) {
    const lines = format(result.error.issues);
    throw new Error(
      `\n❌ Environment validation failed.\n${lines}\n\n` +
        `Fix .env.local (or your Vercel env vars) and restart. ` +
        `See .env.example for the full list of required keys.\n`,
    );
  }
  return result.data;
}

/** Build-time client-safe env (NEXT_PUBLIC_*). Safe to import anywhere. */
export const clientEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
