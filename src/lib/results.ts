/**
 * Round results (pure, no app imports; unit tested in results.test.ts).
 * Totals only count holes a player actually scored; vs par uses the par of those holes.
 */
export type ResultInput = { playerId: number; name: string; strokes: number[] };

export type PlayerResult = {
  playerId: number;
  name: string;
  /** Turn order in the round. */
  order: number;
  total: number;
  holesScored: number;
  /** Holes with no score yet. */
  missing: number;
  vsPar: number;
  /** Competition ranking (1, 1, 3); null if the player has no scores at all. */
  rank: number | null;
  isWinner: boolean;
};

/** Ranked results, best (lowest total) first; players with no scores last. */
export function rankResults(pars: number[], players: ResultInput[]): PlayerResult[] {
  const rows = players.map((p, order) => {
    let total = 0;
    let parScored = 0;
    let holesScored = 0;
    pars.forEach((par, i) => {
      const s = p.strokes[i] ?? 0;
      if (s > 0) {
        total += s;
        parScored += par;
        holesScored += 1;
      }
    });
    return { playerId: p.playerId, name: p.name, order, total, holesScored, missing: pars.length - holesScored, vsPar: total - parScored };
  });
  const scored = rows.filter((r) => r.holesScored > 0).map((r) => r.total);
  return rows
    .map((r) => {
      const rank = r.holesScored > 0 ? scored.filter((t) => t < r.total).length + 1 : null;
      return { ...r, rank, isWinner: rank === 1 };
    })
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order);
}

/** "Alex wins" / "You win": the demo owner (and anyone named "You") gets second-person grammar. */
export function withVerb(name: string, verb: string): string {
  return name.trim().toLowerCase() === 'you' ? `${name} ${verb}` : `${name} ${verb}s`;
}

export function winnerHeadline(results: PlayerResult[]): string {
  const winners = results.filter((r) => r.isWinner).map((r) => r.name);
  if (winners.length === 0) return 'No scores yet';
  if (winners.length === 1) return `${withVerb(winners[0], 'win')}!`;
  return `${winners.slice(0, -1).join(', ')} & ${winners[winners.length - 1]} tie!`;
}
