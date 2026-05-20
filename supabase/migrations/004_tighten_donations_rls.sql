-- =====================================================================
-- MIGRATION 004 — Tighten donations insert RLS
--
-- Background: the original `donations_insert_anyone` policy used
--   with check (true)
-- which let any unauthenticated client POST a fake donation row that
-- would then show up in admin totals and per-charity stats. Combined
-- with the public /api/donations endpoint, this was a write-anywhere
-- spam vector.
--
-- After this migration:
--   * Insert requires an authenticated user (auth.uid() not null)
--   * The row's user_id must match auth.uid()
--   * The Stripe webhook still writes subscription-derived donations
--     using the service-role client, which bypasses RLS entirely.
--
-- Idempotent — safe to re-run.
-- =====================================================================

drop policy if exists "donations_insert_anyone" on public.donations;
drop policy if exists "donations_insert_own" on public.donations;
create policy "donations_insert_own" on public.donations for insert
  with check (auth.uid() is not null and user_id = auth.uid());
