import type { GameDetail } from '@/db/queries';
import { gameResults, totalPar } from '@/lib/game';
import { winnerHeadline } from '@/lib/results';
import { formatVsPar } from '@/lib/stats';
import { formatLongDate } from '@/lib/time';

/** The date a round is filed under: when it was finished, or started if still live. */
export const roundDate = (game: Pick<GameDetail, 'completedAt' | 'startedAt'>) => game.completedAt ?? game.startedAt;

/** "adventure-golf-the-tropical-trail-2026-10-08.png" */
export function scoreCardFileName(game: Pick<GameDetail, 'courseName' | 'completedAt' | 'startedAt'>) {
  const date = roundDate(game);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const slug = game.courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `adventure-golf-${slug || 'round'}-${day}.png`;
}

/** Headline for a finished round: the winner, or "Round complete!" for a solo round. */
export function roundHeadline(game: GameDetail) {
  return game.gamePlayers.length === 1 ? 'Round complete!' : winnerHeadline(gameResults(game));
}

/**
 * Plain-text score card: the share-sheet caption, and the fallback when the image can't be made.
 *   Adventure Golf score card
 *   The Tropical Trail · Sandton · Thu 8 Oct 2026 · 9 holes, par 29
 *   You win!
 *   1. You 24 (−5)
 */
export function scoreCardText(game: GameDetail) {
  const results = gameResults(game);
  const lines = [
    'Adventure Golf score card',
    `${game.courseName} · ${game.venueName} · ${formatLongDate(roundDate(game))} · ${game.holes.length} holes, par ${totalPar(game.holes)}`,
    roundHeadline(game),
    ...results.map((r) => `${r.rank ?? '–'}. ${r.name} ${r.holesScored ? `${r.total} (${formatVsPar(r.vsPar)})` : 'no score'}`),
  ];
  return lines.join('\n');
}
