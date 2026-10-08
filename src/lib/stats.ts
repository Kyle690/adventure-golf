import type { GameDetail } from '@/db/queries';
import { scoreGrid, totalPar } from '@/lib/game';

export type RecentRound = {
  gameId: number;
  courseName: string;
  venueName: string;
  date: Date;
  live: boolean;
  /** Strokes so far / in total. */
  total: number;
  holesPlayed: number;
  holeCount: number;
  /** Total minus par of the holes this player has scored. */
  vsPar: number;
  /** 1-based finishing position among players with a score (ties share a place). */
  position: number | null;
  playerCount: number;
};

export type PlayerStats = {
  rounds: number;
  wins: number;
  best: { total: number; courseName: string; vsPar: number } | null;
  avgPerHole: number | null;
  holesInOne: number;
  recent: RecentRound[];
};

/** Stats for one player from games (newest first), counting only finished rounds for wins/best. */
export function playerStats(playerId: number, games: GameDetail[], recentLimit = 5): PlayerStats {
  let rounds = 0;
  let wins = 0;
  let strokes = 0;
  let holesScored = 0;
  let holesInOne = 0;
  let best: PlayerStats['best'] = null;
  const recent: RecentRound[] = [];

  for (const game of games) {
    const index = game.gamePlayers.findIndex((gp) => gp.player.id === playerId);
    if (index === -1) continue;

    const grid = scoreGrid(game);
    const totals = game.gamePlayers.map((_, p) => grid.reduce((sum, hole) => sum + hole[p], 0));
    const mine = grid.map((hole) => hole[index]);
    const scored = mine.filter((s) => s > 0);
    const total = totals[index];
    const parPlayed = totalPar(game.course.holes.filter((_, h) => mine[h] > 0));
    const vsPar = total - parPlayed;

    strokes += total;
    holesScored += scored.length;
    holesInOne += scored.filter((s) => s === 1).length;

    const ranked = totals.filter((t) => t > 0);
    const position = total > 0 ? ranked.filter((t) => t < total).length + 1 : null;

    if (game.status === 'completed' && total > 0) {
      rounds += 1;
      if (position === 1) wins += 1;
      if (!best || total < best.total) best = { total, courseName: game.course.name, vsPar };
    }

    if (recent.length < recentLimit) {
      recent.push({
        gameId: game.id,
        courseName: game.course.name,
        venueName: game.course.venue.name,
        date: game.completedAt ?? game.startedAt,
        live: game.status === 'in_progress',
        total,
        holesPlayed: scored.length,
        holeCount: game.course.holes.length,
        vsPar,
        position,
        playerCount: game.gamePlayers.length,
      });
    }
  }

  return {
    rounds,
    wins,
    best,
    avgPerHole: holesScored ? strokes / holesScored : null,
    holesInOne,
    recent,
  };
}

/** "+3" / "E" / "−2" golf notation. */
export function formatVsPar(vsPar: number) {
  if (vsPar === 0) return 'E';
  return vsPar > 0 ? `+${vsPar}` : `−${Math.abs(vsPar)}`;
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
