-- =====================================================================
-- Golf Charity Subscription Platform — Supabase schema
-- Run this entire file in Supabase SQL editor on a NEW project.
-- =====================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_kind as enum ('monthly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type draw_status as enum ('draft', 'simulated', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type draw_logic as enum ('random', 'algorithmic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type winner_status as enum (
    'pending_proof', 'pending_review', 'approved', 'rejected', 'paid'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type donation_source as enum ('subscription', 'standalone');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'user',
  charity_id uuid,
  charity_percent numeric(5,2) not null default 10.00 check (charity_percent between 10 and 100),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------------------------------------------------------------------
-- CHARITIES
-- ---------------------------------------------------------------------
create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  mission text,
  image_url text,
  hero_url text,
  website text,
  country text default 'Global',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_charity_fk
    foreign key (charity_id) references public.charities(id) on delete set null
    not valid;
exception when duplicate_object then null; end $$;

create index if not exists charities_active_idx on public.charities(active);
create index if not exists charities_featured_idx on public.charities(featured);

create table if not exists public.charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charities(id) on delete cascade,
  title text not null,
  description text,
  event_date date,
  location text,
  image_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan plan_kind not null,
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  amount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

-- ---------------------------------------------------------------------
-- PAYMENTS (invoice ledger — feeds prize pool + charity contribution)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_invoice_id text unique,
  amount_cents integer not null,
  charity_amount_cents integer not null default 0,
  pool_amount_cents integer not null default 0,
  charity_id uuid references public.charities(id) on delete set null,
  -- Start of the billing period this payment covers.
  period_year smallint not null,
  period_month smallint not null check (period_month between 1 and 12),
  -- Number of months the pool contribution should be spread across.
  --   monthly subscriptions → 1
  --   yearly subscriptions  → 12 (the draw engine divides pool_amount_cents
  --                                by this number for each covered month)
  coverage_months smallint not null default 1 check (coverage_months between 1 and 12),
  created_at timestamptz not null default now()
);

create index if not exists payments_period_idx on public.payments(period_year, period_month);
create index if not exists payments_user_idx on public.payments(user_id);

-- ---------------------------------------------------------------------
-- SCORES (Stableford 1–45). Rolling window of latest 5 enforced by trigger.
-- ---------------------------------------------------------------------
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value between 1 and 45),
  played_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_user_played_idx on public.scores(user_id, played_on desc);

-- Trigger: after each insert/update, prune so only latest 5 by played_on remain.
create or replace function public.prune_scores() returns trigger as $$
begin
  delete from public.scores s
  where s.user_id = new.user_id
    and s.id not in (
      select id from public.scores
      where user_id = new.user_id
      order by played_on desc, created_at desc
      limit 5
    );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prune_scores on public.scores;
create trigger trg_prune_scores
  after insert or update on public.scores
  for each row execute function public.prune_scores();

-- ---------------------------------------------------------------------
-- DRAWS
-- ---------------------------------------------------------------------
create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  period_year smallint not null,
  period_month smallint not null check (period_month between 1 and 12),
  status draw_status not null default 'draft',
  logic draw_logic not null default 'random',
  winning_numbers smallint[] check (array_length(winning_numbers, 1) = 5),
  total_pool_cents integer not null default 0,
  pool_5_cents integer not null default 0,
  pool_4_cents integer not null default 0,
  pool_3_cents integer not null default 0,
  rollover_in_cents integer not null default 0,
  rollover_out_cents integer not null default 0,
  rollover_from_draw_id uuid references public.draws(id) on delete set null,
  published_at timestamptz,
  ran_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (period_year, period_month)
);

-- ---------------------------------------------------------------------
-- DRAW ENTRIES (snapshot of each subscriber's 5 scores at draw time)
-- ---------------------------------------------------------------------
create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  numbers smallint[] not null,
  matches smallint not null default 0,
  tier smallint,
  prize_cents integer not null default 0,
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);

create index if not exists draw_entries_draw_idx on public.draw_entries(draw_id);
create index if not exists draw_entries_user_idx on public.draw_entries(user_id);
create index if not exists draw_entries_tier_idx on public.draw_entries(tier);

-- ---------------------------------------------------------------------
-- WINNERS (verification + payout state for tiered entries)
-- ---------------------------------------------------------------------
create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_entry_id uuid not null unique references public.draw_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_id uuid not null references public.draws(id) on delete cascade,
  tier smallint not null,
  prize_cents integer not null,
  status winner_status not null default 'pending_proof',
  proof_url text,
  admin_notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists winners_user_idx on public.winners(user_id);
create index if not exists winners_status_idx on public.winners(status);

-- ---------------------------------------------------------------------
-- DONATIONS (independent of gameplay)
-- ---------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  charity_id uuid not null references public.charities(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  source donation_source not null default 'standalone',
  stripe_payment_intent_id text,
  donor_name text,
  donor_email text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists donations_charity_idx on public.donations(charity_id);
create index if not exists donations_user_idx on public.donations(user_id);

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(select 1 from public.profiles where id = uid and role = 'admin')
$$;

-- Auto-create profile on signup. Pulls full_name + charity selection + charity %
-- straight from the signup metadata, so the profile is complete even when
-- email confirmation is enabled and the client has no session yet.
-- Admin role granted via ADMIN_EMAILS env var (handled in app code post-signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_charity_id uuid;
  v_charity_percent numeric;
begin
  -- Parse charity_id; ignore if malformed.
  begin
    v_charity_id := nullif(meta->>'charity_id', '')::uuid;
  exception when others then
    v_charity_id := null;
  end;

  -- Parse charity_percent; clamp to [10, 100]; default 10.
  begin
    v_charity_percent := nullif(meta->>'charity_percent', '')::numeric;
  exception when others then
    v_charity_percent := null;
  end;
  v_charity_percent := greatest(10, least(100, coalesce(v_charity_percent, 10)));

  insert into public.profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', split_part(new.email, '@', 1)),
    v_charity_id,
    v_charity_percent
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.charities       enable row level security;
alter table public.charity_events  enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.payments        enable row level security;
alter table public.scores          enable row level security;
alter table public.draws           enable row level security;
alter table public.draw_entries    enable row level security;
alter table public.winners         enable row level security;
alter table public.donations       enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- charities (public read of active rows; admin write)
drop policy if exists "charities_public_read" on public.charities;
create policy "charities_public_read" on public.charities for select
  using (active or public.is_admin(auth.uid()));

drop policy if exists "charities_admin_write" on public.charities;
create policy "charities_admin_write" on public.charities for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- charity_events
drop policy if exists "charity_events_public_read" on public.charity_events;
create policy "charity_events_public_read" on public.charity_events for select using (true);

drop policy if exists "charity_events_admin_write" on public.charity_events;
create policy "charity_events_admin_write" on public.charity_events for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- subscriptions
drop policy if exists "subs_select_own_or_admin" on public.subscriptions;
create policy "subs_select_own_or_admin" on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "subs_admin_write" on public.subscriptions;
create policy "subs_admin_write" on public.subscriptions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- payments
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- scores
drop policy if exists "scores_select_own_or_admin" on public.scores;
create policy "scores_select_own_or_admin" on public.scores for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own" on public.scores for insert
  with check (auth.uid() = user_id);

drop policy if exists "scores_update_own" on public.scores;
create policy "scores_update_own" on public.scores for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scores_delete_own_or_admin" on public.scores;
create policy "scores_delete_own_or_admin" on public.scores for delete
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "scores_admin_all" on public.scores;
create policy "scores_admin_all" on public.scores for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- draws (public read of published; admin all)
drop policy if exists "draws_public_read" on public.draws;
create policy "draws_public_read" on public.draws for select
  using (status = 'published' or public.is_admin(auth.uid()));

drop policy if exists "draws_admin_write" on public.draws;
create policy "draws_admin_write" on public.draws for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- draw_entries
drop policy if exists "entries_select_own_or_admin" on public.draw_entries;
create policy "entries_select_own_or_admin" on public.draw_entries for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "entries_admin_write" on public.draw_entries;
create policy "entries_admin_write" on public.draw_entries for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- winners
drop policy if exists "winners_select_own_or_admin" on public.winners;
create policy "winners_select_own_or_admin" on public.winners for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Users can only transition their own winner row INTO 'pending_review' (i.e. when
-- uploading proof). They cannot self-approve or self-mark 'paid'; those are admin-only.
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

drop policy if exists "winners_admin_all" on public.winners;
create policy "winners_admin_all" on public.winners for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- donations (anyone can insert a standalone donation; reads gated)
drop policy if exists "donations_select_own_or_admin" on public.donations;
create policy "donations_select_own_or_admin" on public.donations for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Insert requires the row to belong to the signed-in user. Without this,
-- anyone could script-loop fake donations that show up in admin totals.
-- Subscription-side donations (source='subscription') are still written by
-- the Stripe webhook via the service-role client, which bypasses RLS.
drop policy if exists "donations_insert_anyone" on public.donations;
drop policy if exists "donations_insert_own" on public.donations;
create policy "donations_insert_own" on public.donations for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "donations_admin_all" on public.donations;
create policy "donations_admin_all" on public.donations for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- STORAGE BUCKET for winner proof uploads
-- (Run once in Supabase Dashboard -> Storage -> New bucket: "winner-proofs",
--  private. Or run the SQL below.)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('winner-proofs', 'winner-proofs', false)
on conflict (id) do nothing;

drop policy if exists "winner_proofs_owner_read" on storage.objects;
create policy "winner_proofs_owner_read" on storage.objects for select
  using (
    bucket_id = 'winner-proofs' and (
      auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())
    )
  );

drop policy if exists "winner_proofs_owner_write" on storage.objects;
create policy "winner_proofs_owner_write" on storage.objects for insert
  with check (
    bucket_id = 'winner-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "winner_proofs_owner_delete" on storage.objects;
create policy "winner_proofs_owner_delete" on storage.objects for delete
  using (
    bucket_id = 'winner-proofs' and (
      auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- SEED — sample charities
-- ---------------------------------------------------------------------
insert into public.charities (slug, name, tagline, description, mission, image_url, hero_url, website, featured) values
  ('ocean-trust', 'Blue Horizon Ocean Trust',
   'Cleaner oceans for the next generation.',
   'A coalition of marine biologists and coastal communities removing plastic from the world''s most fragile coastlines.',
   'Restore 100 km of coastline by 2030.',
   'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800',
   'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600',
   'https://example.com/ocean-trust',
   true),
  ('young-minds', 'Young Minds Foundation',
   'Mental health support for every teenager.',
   'We fund counsellors in schools so no young person has to navigate a crisis alone.',
   'Reach 1 million students through in-school mental health programmes.',
   'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800',
   'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600',
   'https://example.com/young-minds',
   false),
  ('green-acre', 'Green Acre Reforestation',
   'Restoring forests, one acre at a time.',
   'Community-led reforestation across degraded land in South America and Southeast Asia.',
   'Plant 5 million native trees by 2028.',
   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600',
   'https://example.com/green-acre',
   false),
  ('safe-shelter', 'SafeShelter Initiative',
   'A safe bed, every night, for every child.',
   'Funding emergency shelters and transitional housing for displaced families.',
   'Eliminate child homelessness in 50 cities by 2032.',
   'https://images.unsplash.com/photo-1518398046578-8cca57782e17?w=800',
   'https://images.unsplash.com/photo-1518398046578-8cca57782e17?w=1600',
   'https://example.com/safe-shelter',
   false),
  ('open-clinic', 'Open Clinic Network',
   'Free healthcare for the unhoused.',
   'Mobile medical clinics serving people without access to primary care.',
   'Deliver 1 million free consultations annually.',
   'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
   'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600',
   'https://example.com/open-clinic',
   false),
  ('rise-academy', 'Rise Academy',
   'Education that changes a life.',
   'Full-ride scholarships for first-generation university students in underserved regions.',
   'Sponsor 10,000 first-gen graduates by 2030.',
   'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
   'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600',
   'https://example.com/rise-academy',
   false)
on conflict (slug) do nothing;

insert into public.charity_events (charity_id, title, description, event_date, location, image_url)
select c.id,
       'Charity Golf Day — ' || c.name,
       'Join us for a day of golf, community, and impact. Proceeds go directly to ' || c.name || '.',
       (now() + interval '45 days')::date,
       'Pebble Beach, CA',
       c.image_url
from public.charities c
where c.slug in ('ocean-trust','young-minds','green-acre')
on conflict do nothing;
