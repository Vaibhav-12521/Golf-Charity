# Birdie & Cause — Golf Charity Subscription Platform

A subscription-driven web application that combines golf performance tracking,
charity fundraising, and a monthly draw-based reward engine. Built to the
Digital Heroes PRD as a full-stack trainee selection submission.

> Play a round. Change a life.

---

## Stack

| Layer        | Tech                                                |
|--------------|-----------------------------------------------------|
| Framework    | Next.js 14 (App Router, RSC)                        |
| Language     | TypeScript (strict)                                 |
| Styling      | Tailwind CSS, custom design tokens                  |
| UI motion    | Tailwind keyframes + framer-motion (optional)       |
| Auth         | Supabase Auth (email + password, JWT cookies)       |
| Database     | Supabase Postgres with RLS on every table           |
| Storage      | Supabase Storage (`winner-proofs` private bucket)   |
| Payments     | Stripe Checkout + Customer Portal + Webhooks        |
| Email        | Resend (optional — silent no-op if no API key)      |
| Deployment   | Vercel                                              |

---

## Local development

```bash
npm install
cp .env.example .env.local      # fill in keys (see below)
npm run dev                     # http://localhost:3000
```

You'll need accounts on **new** Vercel, Supabase, and Stripe projects as the
PRD requires.

---

## 1 · Supabase setup (≈ 5 minutes)

1. Create a new project at <https://supabase.com>.
2. From **Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` *(never expose to the browser)*
3. Open **SQL Editor** and run the entire `supabase/schema.sql` file — it
   creates every table, RLS policy, the rolling-5 score trigger, the
   `winner-proofs` storage bucket, and seeds 6 sample charities.
4. In **Authentication → Providers**, make sure **Email** is enabled.
   For testing, disable email confirmation: **Authentication → Settings →
   "Confirm email" = OFF**. (Re-enable for production.)
5. In **Authentication → URL Configuration**, add your Vercel preview/prod
   URLs to **Site URL** and **Additional Redirect URLs**:
   - `https://YOUR-DEPLOYMENT.vercel.app`
   - `https://YOUR-DEPLOYMENT.vercel.app/auth/callback`

---

## 2 · Stripe setup (≈ 10 minutes)

1. Create a new Stripe account. Use **Test mode** for the trainee submission.
2. **Products → Add product:**
   - Name: *Golf Charity Subscription*
   - Add a **monthly** recurring price (e.g., $15.00/mo) → copy its price ID
     into `STRIPE_PRICE_MONTHLY`.
   - Add a **yearly** recurring price (e.g., $144.00/yr) → copy its price ID
     into `STRIPE_PRICE_YEARLY`.
3. **Developers → API keys** → copy the secret key → `STRIPE_SECRET_KEY`,
   and the publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Set `SUBSCRIPTION_PRICE_MONTHLY_CENTS` and `SUBSCRIPTION_PRICE_YEARLY_CENTS`
   to match the prices above (in cents).
5. **Customer Portal:** in **Settings → Billing → Customer portal**, click
   "Activate test link" and toggle on:
   - Cancellation
   - Update payment method
   - View billing history
6. **Webhook** (after Vercel deploy):
   - **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR-DEPLOYMENT.vercel.app/api/stripe/webhook`
   - Events: `customer.subscription.*`, `invoice.paid`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

For local testing of the webhook:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
…and use the printed `whsec_…` value as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

Test cards: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 3 · Email (optional)

Resend is used for welcome / draw-published / winner notification emails.
If `RESEND_API_KEY` is unset, the code silently no-ops (so the app still works).

1. Create an account at <https://resend.com>.
2. Add a domain (or use the sandbox one) and copy the API key.

---

## 4 · Vercel deployment

1. Push this project to a new GitHub repo.
2. On **a new Vercel account**, click **Add new → Project** and import the repo.
3. Add every variable from `.env.example` to **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (no trailing slash).
5. Deploy. First build takes ~90 seconds.
6. Go back to Stripe and create the live webhook (step 2.6 above).

---

## 5 · Bootstrap an admin user

The schema creates a `profiles` row automatically on every signup. To promote
yourself to admin:

**Option A — `ADMIN_EMAILS` env var (recommended):**

Set `ADMIN_EMAILS=you@yourdomain.com` (comma-separated for multiple).
The next time *any profile update* runs for those users, they're promoted to
admin. The easiest trigger: sign up with that email, then go to
`/dashboard/charity` and click **Save selection** — that PATCHes the profile
and applies the role.

**Option B — direct SQL:**

```sql
update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
```

Then refresh and you'll see the **Admin** link in the sidebar at
`/admin`.

---

## How it works (the engine)

### Subscription lifecycle
- `POST /api/stripe/checkout` — creates a Stripe Customer (lazy), then a
  Checkout Session for `monthly` or `yearly`. Redirects to Stripe.
- Stripe webhook handles `customer.subscription.created/updated/deleted` →
  upserts the `subscriptions` row.
- `invoice.paid` → inserts a `payments` ledger row, splits the amount into
  `charity_amount_cents` (≥10% per profile) and `pool_amount_cents`, and
  records a `donations` row for the charity side.

### Score management
- Users post a value (1–45) + date to `/api/scores`.
- The DB trigger `prune_scores` keeps only the latest 5 per user, ordered by
  `played_on DESC, created_at DESC` — guaranteed by the database, not the app.

### Draw engine (`src/lib/draw-engine.ts` + `src/lib/draw-runner.ts`)

A draw is one row in `draws`, with a `period_year/period_month` uniqueness
constraint. Lifecycle:

1. **Draft** — admin creates the draw row. Pool numbers are zero.
2. **Run / Simulate** — `runDraw()` does the following:
   - Pulls all active subscribers (`status` ∈ `active|trialing`).
   - Loads their current scores → at most 5 per user.
   - Sums this month's pool contributions from `payments`.
   - Adds any rollover from the previous published draw.
   - Generates winning numbers (random or score-frequency-weighted).
   - Scores each entry, allocates tier pools (40/35/25), splits equally among
     winners in each tier, and computes rollover for an unclaimed jackpot.
   - **Simulate** returns the results without persisting them. **Run** writes
     the entries + draw row in `simulated` status (re-runnable).
3. **Publish** — flips the draw to `published`, makes it visible to users,
   creates `winners` rows for tiered entries, and sends notification emails.

### Winner verification
- A winner sees their prize as **pending_proof** until they upload a screenshot.
- Storage bucket `winner-proofs` is private; RLS scopes objects to
  `{auth.uid()}/...`.
- Admin reviews → `approved` or `rejected` → finally `paid` once payout is
  released externally.

### Charity contribution
- Selected at signup, editable from `/dashboard/charity` (10–100% slider).
- Each `invoice.paid` event splits the amount accordingly and writes a
  `donations` row.
- Standalone donations (no subscription) hit `POST /api/donations`.

---

## Repo map

```
src/
├── app/
│   ├── (public)
│   │   ├── page.tsx                 # Landing
│   │   ├── how-it-works/
│   │   ├── pricing/
│   │   └── charities/[slug]/
│   ├── (auth)
│   │   ├── login/
│   │   ├── signup/
│   │   └── auth/callback/
│   ├── dashboard/                   # User panel
│   │   ├── (overview)
│   │   ├── scores/
│   │   ├── charity/
│   │   ├── draws/
│   │   ├── winnings/
│   │   └── subscription/
│   ├── admin/                       # Admin console
│   │   ├── users/
│   │   ├── draws/[id]/
│   │   ├── charities/
│   │   └── winners/
│   └── api/                         # Route handlers
│       ├── scores/                  # 5-rolling score CRUD
│       ├── stripe/                  # checkout, portal, webhook
│       ├── winners/[id]/proof/      # User proof upload
│       ├── donations/               # Standalone donations
│       └── admin/                   # Admin-only routes
├── components/
│   ├── ui/                          # Button etc.
│   ├── marketing/                   # Nav, footer
│   ├── dashboard/                   # User nav
│   └── admin/                       # Admin nav
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── stripe.ts
│   ├── draw-engine.ts               # Pure functions (pools, matches, distribution)
│   ├── draw-runner.ts               # Orchestrates a draw end-to-end
│   ├── email.ts                     # Resend wrapper
│   ├── auth.ts                      # Session helpers
│   ├── types.ts
│   └── utils.ts
└── middleware.ts                    # Auth gating
supabase/
└── schema.sql                       # One-shot setup
```

---

## Testing checklist (from PRD §16)

- [x] User signup & login (Supabase Auth + email/password)
- [x] Subscription flow (monthly + yearly via Stripe Checkout)
- [x] Score entry — 5-rolling logic (DB trigger; admin-overridable)
- [x] Draw system logic + simulation mode
- [x] Charity selection + contribution percentage (10–100%)
- [x] Winner verification flow + payout tracking
- [x] User dashboard — all modules
- [x] Admin panel — full control across users, draws, charities, winners
- [x] Data accuracy — pool split sums to total; rollover is deterministic
- [x] Responsive design (mobile-first, Tailwind breakpoints)
- [x] Error handling and edge cases (RLS, zod input validation, Stripe failures)

---

## Test credentials to share with reviewers

After deploying, share something like:

```
USER     —  player@birdiecause.demo / DemoPass!1
ADMIN    —  admin@birdiecause.demo  / AdminPass!1
```

Create them by signing up through the UI, then promote the admin one via
`ADMIN_EMAILS` (see "Bootstrap an admin user" above).

---

## Scalability notes (PRD §14)

- Architecture is per-country-friendly: `charities.country` is already a
  filter dimension; payment amounts are stored in cents so multi-currency
  drops in easily by adding a `currency` column.
- Teams / corporate accounts: the `profiles` table can grow a
  `team_id` foreign key without touching draw logic — pools are computed
  from `payments` rows which are user-scoped.
- Campaigns module: schema is ready for a `campaigns` table that
  references `charities` and `donations` via a `campaign_id`.
- Mobile-app ready: server is a clean Next.js API; all auth flows go
  through Supabase, so a future React-Native client can reuse the same
  Supabase JS SDK + REST routes.
```
