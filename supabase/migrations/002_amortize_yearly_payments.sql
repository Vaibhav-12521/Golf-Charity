-- =====================================================================
-- MIGRATION 002 — Amortize yearly pool contributions
--
-- Background: a yearly subscriber pays once for 12 months. Without
-- amortization their entire pool contribution lands in the start month,
-- so the next 11 monthly draws receive nothing from them — unfair to
-- yearly subscribers and inconsistent with monthly subscribers' impact.
--
-- After this migration each payment row carries a `coverage_months`
-- value (1 for monthly, 12 for yearly). The draw engine divides the
-- pool contribution by coverage_months and applies it to every month
-- the payment covers.
--
-- Charity contributions stay lump-sum (charities prefer that for
-- annual budgeting — no change to donations table).
--
-- Idempotent — safe to re-run.
-- =====================================================================

alter table public.payments
  add column if not exists coverage_months smallint not null default 1
  check (coverage_months between 1 and 12);

comment on column public.payments.coverage_months is
  'Number of consecutive months this payment funds the prize pool. 1 for monthly, 12 for yearly.';

-- Backfill any pre-existing yearly payments based on the linked subscription plan.
update public.payments p
   set coverage_months = 12
  from public.subscriptions s
 where p.subscription_id = s.id
   and s.plan = 'yearly'
   and p.coverage_months = 1;
