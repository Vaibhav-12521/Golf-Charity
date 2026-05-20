export type UserRole = "user" | "admin";
export type PlanKind = "monthly" | "yearly";
export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";
export type DrawStatus = "draft" | "simulated" | "published";
export type DrawLogic = "random" | "algorithmic";
export type WinnerStatus =
  | "pending_proof"
  | "pending_review"
  | "approved"
  | "rejected"
  | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  charity_id: string | null;
  charity_percent: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Charity {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  mission: string | null;
  image_url: string | null;
  hero_url: string | null;
  website: string | null;
  country: string | null;
  featured: boolean;
  active: boolean;
  created_at: string;
}

export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: PlanKind;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  amount_cents: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount_cents: number;
  charity_amount_cents: number;
  pool_amount_cents: number;
  charity_id: string | null;
  /** Start of the billing period this payment covers. */
  period_year: number;
  period_month: number;
  /**
   * How many months the prize-pool contribution is spread across.
   * 1 = monthly subscription · 12 = yearly subscription.
   * `pool_amount_cents / coverage_months` is added to each covered month's draw pool.
   * Charity contributions stay lump-sum.
   */
  coverage_months: number;
  created_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  value: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  period_year: number;
  period_month: number;
  status: DrawStatus;
  logic: DrawLogic;
  winning_numbers: number[] | null;
  total_pool_cents: number;
  pool_5_cents: number;
  pool_4_cents: number;
  pool_3_cents: number;
  rollover_in_cents: number;
  rollover_out_cents: number;
  rollover_from_draw_id: string | null;
  published_at: string | null;
  ran_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  numbers: number[];
  matches: number;
  tier: number | null;
  prize_cents: number;
  created_at: string;
}

export interface Winner {
  id: string;
  draw_entry_id: string;
  user_id: string;
  draw_id: string;
  tier: number;
  prize_cents: number;
  status: WinnerStatus;
  proof_url: string | null;
  admin_notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  user_id: string | null;
  charity_id: string;
  amount_cents: number;
  source: "subscription" | "standalone";
  stripe_payment_intent_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  message: string | null;
  created_at: string;
}

// Active subscription helper
export const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];
export const isSubscriptionActive = (s?: { status?: SubscriptionStatus } | null) =>
  !!s && ACTIVE_STATUSES.includes(s.status as SubscriptionStatus);
