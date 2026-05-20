-- =====================================================================
-- MIGRATION 001 — Tighten winners RLS.
--
-- Background: the original `winners_update_own_proof` policy permitted a
-- user to UPDATE any column on their winner row, including `status`, which
-- meant a user could mark themselves as 'paid' from the browser console.
--
-- After this migration, the user can only transition status to
-- 'pending_review' (used when uploading proof), and only when the row is
-- currently 'pending_proof' or 'pending_review'. Admin actions
-- (approve / reject / mark_paid) go through the admin RLS policy.
--
-- Idempotent — safe to re-run.
-- =====================================================================

drop policy if exists "winners_update_own_proof" on public.winners;
create policy "winners_update_own_proof" on public.winners for update
  using (
    auth.uid() = user_id
    and status in ('pending_proof', 'pending_review')
  )
  with check (
    auth.uid() = user_id
    and status = 'pending_review'
  );
