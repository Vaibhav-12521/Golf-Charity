/**
 * Next.js instrumentation hook — runs once at server boot in every runtime.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We use it to validate env vars *before* any request is served. Without this,
 * a missing STRIPE_SECRET_KEY would only surface mid-checkout for a user.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    try {
      validateEnv();
      // eslint-disable-next-line no-console
      console.log("[boot] env validated · server ready");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e instanceof Error ? e.message : e);
      // Fail loudly. Don't crash the process — Next handles re-render on next
      // build — but every dependent server module will throw on first use.
      throw e;
    }
  }
}
