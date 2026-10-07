import { eq } from 'drizzle-orm';

import { PLAYER_COLORS } from '@/theme';
import type { Database } from './client';
import { appMeta, courses, gamePlayers, games, holes, players, scores, venues } from './schema';


/**
 * Demo data from the Figma Make prototype (src/App.tsx):
 * - venue "Sandton" (ADVENTURE GOLF), "Johannesburg, Gauteng"
 * - course "The Tropical Trail", 9 holes, pars [3,3,4,3,2,4,3,3,4] (par 29)
 * - players "You" (scorekeeper = owner), "Alex", "Jordan" with the prototype palette
 * - a round in progress, "Started today, 14:32", on hole 5 of 9 with all 3 players
 * - a last game on the same course "3 weeks ago" whose best total is 24
 */
export const SEED = {
  venue: { name: 'Sandton', address: 'Johannesburg, Gauteng' },
  course: { name: 'The Tropical Trail' },
  pars: [3, 3, 4, 3, 2, 4, 3, 3, 4],
  players: [
    { name: 'You', avatar: PLAYER_COLORS[0], isOwner: true },
    { name: 'Alex', avatar: PLAYER_COLORS[1], isOwner: false },
    { name: 'Jordan', avatar: PLAYER_COLORS[2], isOwner: false },
  ],
  /** Strokes per player (You, Alex, Jordan) for each hole of the finished game. You = 24 (best). */
  lastGameScores: [
    [3, 2, 3, 3, 2, 3, 3, 2, 3],
    [3, 3, 4, 4, 2, 4, 3, 3, 5],
    [4, 3, 4, 3, 3, 5, 3, 3, 4],
  ],
  /** Holes 1-4 played in the live round, so it resumes on hole 5 of 9. */
  liveGameScores: [
    [3, 2, 4, 3],
    [4, 3, 4, 2],
    [3, 3, 5, 3],
  ],
};

/**
 * DEV ONLY demo data (the prototype's Sandton / Tropical Trail / Alex & Jordan / demo games).
 * Real installs start empty and go through onboarding. Enabled with EXPO_PUBLIC_DEMO_SEED=1 in a
 * dev build; skipped if an owner already exists, so it never mixes with real data.
 */
export async function seedDemoData(db: Database) {
  const owner = db.select().from(players).where(eq(players.isOwner, true)).get();
  if (owner) return;

  const now = new Date();
  const liveStartedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 32);
  const lastPlayed = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  lastPlayed.setHours(15, 10, 0, 0);
  const lastStarted = new Date(lastPlayed.getTime() - 55 * 60 * 1000);

  db.transaction((tx) => {
    const venue = tx.insert(venues).values(SEED.venue).returning().get();
    const course = tx.insert(courses).values({ ...SEED.course, venueId: venue.id }).returning().get();
    const holeRows = tx
      .insert(holes)
      .values(SEED.pars.map((par, i) => ({ courseId: course.id, number: i + 1, par })))
      .returning()
      .all();
    const playerRows = tx.insert(players).values(SEED.players).returning().all();

    const addGame = (
      values: typeof games.$inferInsert,
      strokes: number[][],
    ) => {
      const game = tx.insert(games).values(values).returning().get();
      tx.insert(gamePlayers)
        .values(playerRows.map((p, position) => ({ gameId: game.id, playerId: p.id, position })))
        .run();
      const rows = playerRows.flatMap((p, pi) =>
        strokes[pi].map((s, hi) => ({ gameId: game.id, playerId: p.id, holeId: holeRows[hi].id, strokes: s })),
      );
      if (rows.length) tx.insert(scores).values(rows).run();
    };

    addGame(
      { courseId: course.id, status: 'completed', startedAt: lastStarted, completedAt: lastPlayed },
      SEED.lastGameScores,
    );
    addGame({ courseId: course.id, status: 'in_progress', startedAt: liveStartedAt }, SEED.liveGameScores);

    tx.insert(appMeta)
      .values({ key: 'onboarding', value: 'complete' })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: 'complete' } })
      .run();
  });
}
