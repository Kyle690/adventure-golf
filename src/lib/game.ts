import type { GameDetail } from '@/db/queries';
import { rankResults, type PlayerResult } from '@/lib/results';

/** strokes[holeIndex][playerIndex] over the game's own hole snapshot, 0 = not entered yet. */
export function scoreGrid(game: GameDetail): number[][] {
  const byKey = new Map(game.scores.map((s) => [`${s.gameHoleId}:${s.playerId}`, s.strokes]));
  return game.holes.map((hole) =>
    game.gamePlayers.map(({ player }) => byKey.get(`${hole.id}:${player.id}`) ?? 0),
  );
}

export function playerTotals(game: GameDetail): number[] {
  const grid = scoreGrid(game);
  return game.gamePlayers.map((_, p) => grid.reduce((sum, hole) => sum + hole[p], 0));
}

export function totalPar(holes: { par: number }[]) {
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

/** Index of the first hole where not every player has a score (last hole if all are done). */
export function currentHoleIndex(game: GameDetail): number {
  const grid = scoreGrid(game);
  const index = grid.findIndex((hole) => hole.some((strokes) => strokes === 0));
  return index === -1 ? Math.max(0, grid.length - 1) : index;
}

/** Lowest non-zero total in a game ("best" on the Last game card). */
export function bestTotal(game: GameDetail): number | null {
  const totals = playerTotals(game).filter((t) => t > 0);
  return totals.length ? Math.min(...totals) : null;
}

/** Ranked results for a game (see lib/results). */
export function gameResults(game: GameDetail): PlayerResult[] {
  const grid = scoreGrid(game);
  return rankResults(
    game.holes.map((h) => h.par),
    game.gamePlayers.map(({ player }, p) => ({ playerId: player.id, name: player.name, strokes: grid.map((hole) => hole[p]) })),
  );
}
