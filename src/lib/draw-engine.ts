/**
 * Draw engine — random + algorithmic generation, matching, and prize math.
 *
 * Pool split (per PRD §07): 5-match 40%, 4-match 35%, 3-match 25%.
 * 5-match jackpot rolls over if no winner.
 */

export const POOL_SPLIT = { five: 0.4, four: 0.35, three: 0.25 } as const;

const SCORE_MIN = 1;
const SCORE_MAX = 45;

/** Cryptographically-safe random int in [min, max]. */
/** Cryptographically-strong random uint32 in [0, 2^32). */
function randUint32(): number {
  const buf = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  }
  // Last-resort fallback for environments without WebCrypto (none of our supported
  // runtimes — Node 18+, browsers — fall here, but keeps the function total).
  return Math.floor(Math.random() * 0x1_0000_0000);
}

/** Crypto-backed random int in [min, max]. */
function randInt(min: number, max: number): number {
  const span = max - min + 1;
  return min + (randUint32() % span);
}

/** Crypto-backed random float in [0, 1). Drops `Math.random()` entirely. */
function randFloat(): number {
  return randUint32() / 0x1_0000_0000;
}

/** Draw 5 distinct numbers in [1,45]. */
export function generateRandomWinningNumbers(): number[] {
  const set = new Set<number>();
  while (set.size < 5) set.add(randInt(SCORE_MIN, SCORE_MAX));
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Algorithmic generation: weighted by user-score frequency.
 * `mode='most'` favours the most common scores across the subscriber base
 * (more entries will partially match — higher engagement).
 * `mode='least'` favours the least common (more jackpot rollovers).
 */
export function generateAlgorithmicWinningNumbers(
  allScores: number[],
  mode: "most" | "least" = "most",
): number[] {
  const freq = new Map<number, number>();
  for (let n = SCORE_MIN; n <= SCORE_MAX; n++) freq.set(n, 0);
  for (const s of allScores) {
    if (s >= SCORE_MIN && s <= SCORE_MAX) freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  // weighted sampling without replacement
  const weights = new Map<number, number>();
  for (const [n, c] of freq) {
    const w = mode === "most" ? c + 1 : 1 / (c + 1); // +1 floor so unused numbers can still be picked
    weights.set(n, w);
  }
  // Weighted sampling without replacement — same crypto-backed entropy source
  // as the random generator (no Math.random anywhere in the path).
  const picked: number[] = [];
  while (picked.length < 5) {
    let total = 0;
    for (const [n, w] of weights) if (!picked.includes(n)) total += w;
    let r = randFloat() * total;
    for (const [n, w] of weights) {
      if (picked.includes(n)) continue;
      r -= w;
      if (r <= 0) {
        picked.push(n);
        break;
      }
    }
  }
  return picked.sort((a, b) => a - b);
}

/** Intersection count between a player's numbers and the winning set. */
export function countMatches(playerNumbers: number[], winning: number[]): number {
  const set = new Set(winning);
  // de-dup player numbers first — a player with [10,10,...] shouldn't get a free match
  const unique = new Set(playerNumbers);
  let n = 0;
  for (const v of unique) if (set.has(v)) n++;
  return n;
}

export function tierFor(matches: number): 3 | 4 | 5 | null {
  if (matches >= 5) return 5;
  if (matches === 4) return 4;
  if (matches === 3) return 3;
  return null;
}

export interface PoolBreakdown {
  total_pool_cents: number;
  rollover_in_cents: number;
  pool_5_cents: number;
  pool_4_cents: number;
  pool_3_cents: number;
}

/**
 * Compute pool amounts. `contributions` = sum of pool contributions from this month's payments.
 * `rollover_in_cents` is added entirely to the 5-tier pool (jackpot).
 */
export function computePools(
  contributions_cents: number,
  rollover_in_cents = 0,
): PoolBreakdown {
  const total = contributions_cents;
  const pool_5 = Math.round(total * POOL_SPLIT.five) + rollover_in_cents;
  const pool_4 = Math.round(total * POOL_SPLIT.four);
  // pool_3 absorbs rounding remainder so the three tiers sum to exactly `total + rollover`.
  const pool_3 = total + rollover_in_cents - pool_5 - pool_4;
  return {
    total_pool_cents: total,
    rollover_in_cents,
    pool_5_cents: pool_5,
    pool_4_cents: pool_4,
    pool_3_cents: pool_3,
  };
}

export interface ScoredEntry<E> {
  entry: E;
  matches: number;
  tier: 3 | 4 | 5 | null;
}

export interface PrizeAssignment<E> {
  entry: E;
  matches: number;
  tier: 3 | 4 | 5 | null;
  prize_cents: number;
}

/**
 * Score all entries against winning numbers, then split each tier's pool
 * equally among winners in that tier. Returns:
 *   - per-entry result rows
 *   - rollover amount (pool_5 if no 5-tier winners; 0 otherwise)
 */
export function distributePrizes<E extends { numbers: number[] }>(
  entries: E[],
  winning: number[],
  pools: PoolBreakdown,
): { results: PrizeAssignment<E>[]; rollover_out_cents: number } {
  const scored: ScoredEntry<E>[] = entries.map((entry) => {
    const matches = countMatches(entry.numbers, winning);
    return { entry, matches, tier: tierFor(matches) };
  });

  const byTier: Record<3 | 4 | 5, ScoredEntry<E>[]> = { 3: [], 4: [], 5: [] };
  for (const s of scored) if (s.tier) byTier[s.tier].push(s);

  const splits: Record<3 | 4 | 5, number> = {
    5: byTier[5].length ? Math.floor(pools.pool_5_cents / byTier[5].length) : 0,
    4: byTier[4].length ? Math.floor(pools.pool_4_cents / byTier[4].length) : 0,
    3: byTier[3].length ? Math.floor(pools.pool_3_cents / byTier[3].length) : 0,
  };

  const results: PrizeAssignment<E>[] = scored.map((s) => ({
    entry: s.entry,
    matches: s.matches,
    tier: s.tier,
    prize_cents: s.tier ? splits[s.tier] : 0,
  }));

  const rollover_out_cents = byTier[5].length === 0 ? pools.pool_5_cents : 0;

  return { results, rollover_out_cents };
}
