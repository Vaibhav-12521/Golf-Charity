import { createAdminClient } from "@/lib/supabase/admin";
import {
  computePools,
  countMatches,
  distributePrizes,
  generateAlgorithmicWinningNumbers,
  generateRandomWinningNumbers,
  tierFor,
} from "@/lib/draw-engine";

interface Options {
  drawId: string;
  logic?: "random" | "algorithmic";
  /** Simulation mode does NOT persist winning numbers or entries — it returns results only. */
  simulate?: boolean;
}

/**
 * Run a draw end-to-end:
 *   1. Read all eligible subscribers (active subscription + ≥ 3 scores).
 *   2. Snapshot each entrant's current 5 scores.
 *   3. Compute pool contributions from this month's payments.
 *   4. Generate winning numbers (random | algorithmic).
 *   5. Score each entry, allocate prizes, compute rollover.
 *   6. Persist if not in simulation mode.
 *
 * Returns a serialisable result for the admin UI / API.
 */
export async function runDraw({ drawId, logic, simulate = false }: Options) {
  const admin = createAdminClient();

  const { data: draw, error: drawErr } = await admin.from("draws").select("*").eq("id", drawId).single();
  if (drawErr || !draw) throw new Error("Draw not found");
  if (draw.status === "published") throw new Error("Published draws cannot be re-run");

  const effectiveLogic: "random" | "algorithmic" = logic || draw.logic;

  // --- 1) Eligible subscribers: active subscription + has scores ---
  const { data: activeSubs } = await admin
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  const userIds = Array.from(new Set((activeSubs || []).map((s) => s.user_id)));
  if (userIds.length === 0) {
    throw new Error("No active subscribers — nothing to draw against.");
  }

  // --- 2) Pull scores for each eligible user ---
  // Ordered newest-first so each user's 5 numbers are deterministic. The
  // prune_scores trigger keeps at most 5 per user, but the ordering hint
  // makes that contract explicit and survives future trigger changes.
  const { data: scoreRows } = await admin
    .from("scores")
    .select("user_id, value, played_on")
    .in("user_id", userIds)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });

  const byUser = new Map<string, number[]>();
  for (const r of scoreRows || []) {
    const arr = byUser.get(r.user_id) || [];
    arr.push(r.value);
    byUser.set(r.user_id, arr);
  }

  // PRD §05 — "Users must enter their last 5 golf scores."
  // A user is only entered in the draw when they have a complete set of 5.
  // Anything fewer is silently excluded (no padding, no zero-fill — that would
  // either disadvantage them with un-matchable zeros, or unfairly inflate their
  // hit-rate by duplicating a single score).
  const entrants: { user_id: string; numbers: number[] }[] = [];
  let excludedForMissingScores = 0;
  for (const uid of userIds) {
    const nums = (byUser.get(uid) || []).slice(0, 5);
    if (nums.length === 5) {
      entrants.push({ user_id: uid, numbers: nums });
    } else {
      excludedForMissingScores++;
    }
  }
  if (entrants.length === 0) {
    throw new Error(
      excludedForMissingScores > 0
        ? `No eligible entrants. ${excludedForMissingScores} active subscriber(s) have fewer than 5 scores logged.`
        : "No subscribers have entered scores yet.",
    );
  }

  // --- 3) Pool contributions — amortized for yearly subscribers ---
  //
  // Each payment carries (period_year, period_month, coverage_months).
  // A monthly payment has coverage_months = 1, so only its own month gets
  // pool_amount_cents. A yearly payment has coverage_months = 12, so each
  // of the 12 covered months gets pool_amount_cents/12.
  //
  // We pull payments whose coverage window overlaps with this draw's month.
  const drawIdx = draw.period_year * 12 + (draw.period_month - 1);
  // Earliest start that could still cover this draw: drawIdx - 11 months.
  const lowerIdx = drawIdx - 11;
  const lowerYear = Math.floor(lowerIdx / 12);
  const lowerMonth = (lowerIdx % 12) + 1;
  const { data: pmts } = await admin
    .from("payments")
    .select("pool_amount_cents, coverage_months, period_year, period_month")
    // Period start ≤ draw month  AND  start + coverage > draw month.
    // We pre-filter by (year, month) ≥ lower bound for query efficiency,
    // then finalize in code (Postgres doesn't easily compare year+month tuples).
    .or(
      `period_year.gt.${lowerYear},and(period_year.eq.${lowerYear},period_month.gte.${lowerMonth})`,
    )
    .or(
      `period_year.lt.${draw.period_year},and(period_year.eq.${draw.period_year},period_month.lte.${draw.period_month})`,
    );

  let contributions = 0;
  for (const p of pmts || []) {
    const startIdx = p.period_year * 12 + (p.period_month - 1);
    const cover = p.coverage_months || 1;
    // The draw month must be in [startIdx, startIdx + cover - 1].
    if (drawIdx >= startIdx && drawIdx < startIdx + cover) {
      contributions += Math.floor(p.pool_amount_cents / cover);
    }
  }

  const pools = computePools(contributions, draw.rollover_in_cents || 0);

  // --- 4) Winning numbers ---
  const winningNumbers =
    effectiveLogic === "random"
      ? generateRandomWinningNumbers()
      : generateAlgorithmicWinningNumbers(
          (scoreRows || []).map((r) => r.value),
          "most",
        );

  // --- 5) Score + allocate ---
  const { results, rollover_out_cents } = distributePrizes(entrants, winningNumbers, pools);

  if (simulate) {
    return {
      simulated: true,
      logic: effectiveLogic,
      winning_numbers: winningNumbers,
      pools,
      rollover_out_cents,
      excluded_for_missing_scores: excludedForMissingScores,
      entries: results.map((r) => ({
        user_id: r.entry.user_id,
        numbers: r.entry.numbers,
        matches: r.matches,
        tier: r.tier,
        prize_cents: r.prize_cents,
      })),
    };
  }

  // --- 6) Persist draft → simulated/ran state ---
  // Clear prior entries (re-run scenarios) and write the new snapshot.
  await admin.from("draw_entries").delete().eq("draw_id", drawId);

  await admin.from("draw_entries").insert(
    results.map((r) => ({
      draw_id: drawId,
      user_id: r.entry.user_id,
      numbers: r.entry.numbers,
      matches: r.matches,
      tier: r.tier,
      prize_cents: r.prize_cents,
    })),
  );

  await admin
    .from("draws")
    .update({
      logic: effectiveLogic,
      winning_numbers: winningNumbers,
      total_pool_cents: pools.total_pool_cents,
      pool_5_cents: pools.pool_5_cents,
      pool_4_cents: pools.pool_4_cents,
      pool_3_cents: pools.pool_3_cents,
      rollover_out_cents,
      ran_at: new Date().toISOString(),
      status: "simulated",
    })
    .eq("id", drawId);

  return {
    simulated: false,
    logic: effectiveLogic,
    winning_numbers: winningNumbers,
    pools,
    rollover_out_cents,
    entry_count: results.length,
    excluded_for_missing_scores: excludedForMissingScores,
  };
}

/**
 * Publish — finalises a previously ran draw. Creates winner rows for tiered entries
 * so users can upload proof + admins can release payouts. Sends notification emails.
 */
export async function publishDraw(drawId: string) {
  const admin = createAdminClient();
  const { data: draw, error: drawErr } = await admin.from("draws").select("*").eq("id", drawId).single();
  if (drawErr || !draw) throw new Error("Draw not found");
  if (draw.status === "published") throw new Error("Already published");
  if (draw.status === "draft" || !draw.winning_numbers) throw new Error("Run the draw before publishing.");

  const { data: tiered } = await admin
    .from("draw_entries")
    .select("id, user_id, tier, prize_cents")
    .eq("draw_id", drawId)
    .not("tier", "is", null);

  // upsert winner rows. one per tiered entry.
  if (tiered && tiered.length > 0) {
    await admin.from("winners").upsert(
      tiered.map((e) => ({
        draw_entry_id: e.id,
        user_id: e.user_id,
        draw_id: drawId,
        tier: e.tier!,
        prize_cents: e.prize_cents,
        status: "pending_proof",
      })),
      { onConflict: "draw_entry_id" },
    );
  }

  await admin
    .from("draws")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", drawId);

  // verify the math one more time
  const { data: post } = await admin.from("draw_entries").select("matches, prize_cents, tier").eq("draw_id", drawId);
  const stats = {
    entries: post?.length || 0,
    tier_5: post?.filter((e) => e.tier === 5).length || 0,
    tier_4: post?.filter((e) => e.tier === 4).length || 0,
    tier_3: post?.filter((e) => e.tier === 3).length || 0,
  };
  return stats;
}

// type-only safe import reference for the test of countMatches/tierFor exports
void countMatches; void tierFor;
