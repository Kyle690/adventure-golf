/**
 * Calculated handicap (pure functions, no app imports, so it can be unit tested with plain node).
 *
 * Formula
 *   1. For every COMPLETED round the player has scores in, take the holes they scored:
 *        differential per hole = (strokes on those holes − par of those holes) / holes scored
 *   2. Take the 20 most recent such rounds.
 *        If there are 8 or more, keep the 8 lowest (best) differentials; otherwise keep them all.
 *   3. handicap = mean(kept differentials) × 18      (strokes over par per 18 holes)
 *   4. Rounded to 1 decimal. No completed rounds -> null (shown as "–").
 *
 * Normalising per hole and scaling to 18 makes 9- and 18-hole courses comparable. The value can be
 * negative for a player who beats par on average (shown with a minus sign).
 */

export type HandicapRound = {
  /** Total strokes on the holes the player scored in that round. */
  strokes: number;
  /** Par of those same holes. */
  par: number;
  /** Number of holes scored (> 0). */
  holes: number;
  /** When the round was played/completed; used to pick the most recent rounds. */
  date: Date;
};

export const HANDICAP_WINDOW = 20;
export const HANDICAP_BEST_OF = 8;
export const HANDICAP_HOLES = 18;

/** Strokes over par per hole for one round. */
export function differentialPerHole(round: HandicapRound): number {
  return (round.strokes - round.par) / round.holes;
}

/** The differentials that count: best 8 of the 20 most recent rounds, or all if fewer than 8. */
export function countingDifferentials(rounds: HandicapRound[]): number[] {
  const recent = rounds
    .filter((r) => r.holes > 0)
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, HANDICAP_WINDOW)
    .map(differentialPerHole);
  if (recent.length < HANDICAP_BEST_OF) return recent;
  return recent.sort((a, b) => a - b).slice(0, HANDICAP_BEST_OF);
}

/** Calculated handicap, 1 decimal, or null when there are no completed rounds. */
export function calculateHandicap(rounds: HandicapRound[]): number | null {
  const diffs = countingDifferentials(rounds);
  if (diffs.length === 0) return null;
  const mean = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  const value = Math.round(mean * HANDICAP_HOLES * 10) / 10;
  return Object.is(value, -0) ? 0 : value;
}

/** "3.4", "0.0", "−1.2", or "–" when there is no handicap. */
export function formatHandicap(value: number | null | undefined): string {
  if (value == null) return '–';
  return value < 0 ? `−${Math.abs(value).toFixed(1)}` : value.toFixed(1);
}

export type EffectiveHandicap = { value: number | null; source: 'calculated' | 'starting' | null };

/**
 * What to show for a player: the calculated handicap once they have a completed round; before
 * that, the manually entered starting handicap (if any).
 */
export function effectiveHandicap(calculated: number | null, starting: number | null | undefined): EffectiveHandicap {
  if (calculated != null) return { value: calculated, source: 'calculated' };
  if (starting != null) return { value: starting, source: 'starting' };
  return { value: null, source: null };
}
