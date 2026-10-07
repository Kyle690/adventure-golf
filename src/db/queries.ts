import { and, asc, count, desc, eq, max } from 'drizzle-orm';

import { db } from './client';
import { notifyDbChanged } from './events';
import {
  appMeta,
  courses,
  type Difficulty,
  gamePlayers,
  games,
  holes,
  players,
  scores,
  venues,
} from './schema';

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Venues with their courses and holes (hole order = number). */
export function listVenues() {
  return db.query.venues.findMany({
    orderBy: [asc(venues.id)],
    with: {
      courses: {
        orderBy: [asc(courses.id)],
        with: { holes: { orderBy: [asc(holes.number)] } },
      },
    },
  });
}
export type VenueWithCourses = Awaited<ReturnType<typeof listVenues>>[number];
export type CourseWithHoles = VenueWithCourses['courses'][number];

export async function countVenues() {
  const [row] = await db.select({ value: count() }).from(venues);
  return row?.value ?? 0;
}

/** Owner first, then the crew in the order they were added. */
export function listPlayers() {
  return db.select().from(players).orderBy(desc(players.isOwner), asc(players.id));
}

export async function getOwner() {
  const [owner] = await db.select().from(players).where(eq(players.isOwner, true)).limit(1);
  return owner ?? null;
}

const gameDetail = {
  course: {
    with: {
      venue: true as const,
      holes: { orderBy: [asc(holes.number)] },
    },
  },
  gamePlayers: {
    orderBy: [asc(gamePlayers.position)],
    with: { player: true as const },
  },
  scores: true as const,
};

export function getGame(id: number) {
  return db.query.games.findFirst({ where: eq(games.id, id), with: gameDetail });
}
export type GameDetail = NonNullable<Awaited<ReturnType<typeof getGame>>>;

/** The most recently started round that is still in progress. */
export function getLiveGame() {
  return db.query.games.findFirst({
    where: eq(games.status, 'in_progress'),
    orderBy: [desc(games.startedAt), desc(games.id)],
    with: gameDetail,
  });
}

export function getLastCompletedGame() {
  return db.query.games.findFirst({
    where: eq(games.status, 'completed'),
    orderBy: [desc(games.completedAt), desc(games.id)],
    with: gameDetail,
  });
}

/** completedAt of the last finished game per course. */
export async function lastPlayedByCourse() {
  const rows = await db
    .select({ courseId: games.courseId, lastPlayed: max(games.completedAt) })
    .from(games)
    .where(eq(games.status, 'completed'))
    .groupBy(games.courseId);
  return new Map(rows.map((r) => [r.courseId, r.lastPlayed ? new Date(r.lastPlayed) : null]));
}

// ---------------------------------------------------------------------------
// Writes (synchronous expo-sqlite driver; transactions use the sync API)
// ---------------------------------------------------------------------------

export function setHolePar(holeId: number, par: number) {
  db.update(holes).set({ par }).where(eq(holes.id, holeId)).run();
  notifyDbChanged();
}

export function addPlayer(name: string, avatar: string) {
  const player = db.insert(players).values({ name, avatar, isOwner: false }).returning().get();
  notifyDbChanged();
  return player;
}

/** Removes a crew member (never the owner). Cascades to their game entries and scores. */
export function removePlayer(id: number) {
  db.delete(players)
    .where(and(eq(players.id, id), eq(players.isOwner, false)))
    .run();
  notifyDbChanged();
}

/**
 * Starts a round on a course with players in turn order. Only one round is live at a time
 * (as in the prototype), so any other in-progress round is marked abandoned, not deleted.
 */
export function startGame(courseId: number, playerIds: number[]) {
  if (playerIds.length === 0) throw new Error('Pick at least one player');
  const game = db.transaction((tx) => {
    tx.update(games).set({ status: 'abandoned' }).where(eq(games.status, 'in_progress')).run();
    const created = tx.insert(games).values({ courseId, status: 'in_progress', startedAt: new Date() }).returning().get();
    tx.insert(gamePlayers)
      .values(playerIds.map((playerId, position) => ({ gameId: created.id, playerId, position })))
      .run();
    return created;
  });
  notifyDbChanged();
  return game;
}

/** Upserts a player's strokes on a hole; 0 clears the score (shown as "–"). */
export function setScore(gameId: number, playerId: number, holeId: number, strokes: number) {
  if (strokes <= 0) {
    db.delete(scores)
      .where(and(eq(scores.gameId, gameId), eq(scores.playerId, playerId), eq(scores.holeId, holeId)))
      .run();
  } else {
    db.insert(scores)
      .values({ gameId, playerId, holeId, strokes })
      .onConflictDoUpdate({
        target: [scores.gameId, scores.playerId, scores.holeId],
        set: { strokes, updatedAt: new Date() },
      })
      .run();
  }
  notifyDbChanged();
}

export function completeGame(id: number) {
  db.update(games).set({ status: 'completed', completedAt: new Date() }).where(eq(games.id, id)).run();
  notifyDbChanged();
}

/** "Quit round": deletes the game; game_players and scores cascade. */
export function deleteGame(id: number) {
  db.delete(games).where(eq(games.id, id)).run();
  notifyDbChanged();
}

// ---------------------------------------------------------------------------
// App metadata + onboarding
// ---------------------------------------------------------------------------

type MetaKey = 'onboarding' | 'onboarding_venue_id' | 'onboarding_course_id';

function getMeta(key: MetaKey) {
  return db.select().from(appMeta).where(eq(appMeta.key, key)).get()?.value ?? null;
}

function setMeta(key: MetaKey, value: string) {
  db.insert(appMeta).values({ key, value }).onConflictDoUpdate({ target: appMeta.key, set: { value } }).run();
}

/**
 * Onboarding runs on a fresh install (no owner yet) and keeps running until it is finished, so an
 * app that is closed half-way resumes where it left off. ('onboarding' meta: in_progress | complete)
 */
export async function needsOnboarding() {
  const owner = await getOwner();
  return !owner || getMeta('onboarding') === 'in_progress';
}

/** Everything onboarding has saved so far (used to resume and to edit earlier steps). */
export async function getOnboardingState() {
  const owner = await getOwner();
  const venueId = Number(getMeta('onboarding_venue_id')) || null;
  const courseId = Number(getMeta('onboarding_course_id')) || null;
  const venue = venueId ? ((await db.query.venues.findFirst({ where: eq(venues.id, venueId) })) ?? null) : null;
  const course = courseId
    ? ((await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
        with: { holes: { orderBy: [asc(holes.number)] } },
      })) ?? null)
    : null;
  const crew = await listPlayers();
  return { owner, venue, course, crew };
}
export type OnboardingState = Awaited<ReturnType<typeof getOnboardingState>>;

/** Step 1: create (or update) the owner. */
export function saveOwner(values: { name: string; avatar: string; handicap: number | null }) {
  const owner = db.transaction((tx) => {
    const existing = tx.select().from(players).where(eq(players.isOwner, true)).get();
    const row = existing
      ? tx.update(players).set(values).where(eq(players.id, existing.id)).returning().get()
      : tx.insert(players).values({ ...values, isOwner: true }).returning().get();
    tx.insert(appMeta)
      .values({ key: 'onboarding', value: 'in_progress' })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: 'in_progress' } })
      .run();
    return row;
  });
  notifyDbChanged();
  return owner;
}

/** Step 2: create (or update) the onboarding venue. */
export function saveVenue(values: { id?: number | null; name: string; address: string | null; image: string | null }) {
  const { id, ...data } = values;
  const venue = id
    ? db.update(venues).set(data).where(eq(venues.id, id)).returning().get()
    : db.insert(venues).values(data).returning().get();
  setMeta('onboarding_venue_id', String(venue.id));
  notifyDbChanged();
  return venue;
}

export type HoleInput = { par: number; length: number | null; difficulty: Difficulty | null };

/** Step 3: create (or update) a course and its holes. Holes are replaced wholesale on edit. */
export function saveCourse(values: {
  id?: number | null;
  venueId: number;
  name: string;
  image: string | null;
  holes: HoleInput[];
}) {
  const course = db.transaction((tx) => {
    const data = { venueId: values.venueId, name: values.name, image: values.image };
    const row = values.id
      ? tx.update(courses).set(data).where(eq(courses.id, values.id)).returning().get()
      : tx.insert(courses).values(data).returning().get();
    tx.delete(holes).where(eq(holes.courseId, row.id)).run();
    tx.insert(holes)
      .values(values.holes.map((hole, i) => ({ ...hole, courseId: row.id, number: i + 1 })))
      .run();
    return row;
  });
  setMeta('onboarding_course_id', String(course.id));
  notifyDbChanged();
  return course;
}

/** Step 4: start the first round with the whole crew and mark onboarding complete. */
export function finishOnboarding(courseId: number, playerIds: number[]) {
  const game = startGame(courseId, playerIds);
  setMeta('onboarding', 'complete');
  notifyDbChanged();
  return game;
}
