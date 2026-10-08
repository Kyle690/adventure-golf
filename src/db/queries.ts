import { and, asc, count, desc, eq, gt, inArray, max, ne, notExists, sql } from 'drizzle-orm';

import { summarizeVenue } from '@/lib/venue-stats';
import { MAX_PLAYERS } from '@/theme';

import { db } from './database';
import { notifyDbChanged } from './events';
import {
  appMeta,
  courses,
  type Difficulty,
  gameHoles,
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

export function getVenue(id: number) {
  return db.query.venues.findFirst({
    where: eq(venues.id, id),
    with: {
      courses: {
        orderBy: [asc(courses.id)],
        with: { holes: { orderBy: [asc(holes.number)] } },
      },
    },
  });
}

/** Adds a venue outside onboarding (Venues tab / Setup "Create a new venue"). */
export function createVenue(values: { name: string; address: string | null; image: string | null }) {
  const venue = db.insert(venues).values(values).returning().get();
  notifyDbChanged();
  return venue;
}

/**
 * Per-course game aggregates (SQL GROUP BY): finished games played, and the last time the course
 * was played (finished or live round; abandoned rounds ignored). lastPlayed is unix seconds.
 */
export function courseGameAggregates() {
  return db
    .select({
      courseId: games.courseId,
      gamesPlayed: sql<number>`sum(case when ${games.status} = 'completed' then 1 else 0 end)`,
      lastPlayed: sql<number | null>`max(coalesce(${games.completedAt}, ${games.startedAt}))`,
    })
    .from(games)
    .where(ne(games.status, 'abandoned'))
    .groupBy(games.courseId);
}

/**
 * One row per player per finished game: strokes, and par / count of the holes they scored, all
 * from the game's own hole snapshot (game_holes), plus how many holes that round had.
 */
export function completedRoundTotals() {
  return db
    .select({
      gameId: scores.gameId,
      playerId: scores.playerId,
      courseId: games.courseId,
      courseName: games.courseName,
      total: sql<number>`sum(${scores.strokes})`,
      par: sql<number>`sum(${gameHoles.par})`,
      holes: sql<number>`count(*)`,
      roundHoles: sql<number>`(select count(*) from ${gameHoles} gh where gh.game_id = ${games.id})`,
    })
    .from(scores)
    .innerJoin(games, eq(scores.gameId, games.id))
    .innerJoin(gameHoles, eq(scores.gameHoleId, gameHoles.id))
    .where(eq(games.status, 'completed'))
    .groupBy(scores.gameId, scores.playerId);
}
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

/**
 * A game as played: snapshot names (courseName, venueName) and snapshot holes (game_holes), never
 * the live course, so later course edits can't change it.
 */
const gameDetail = {
  holes: { orderBy: [asc(gameHoles.number)] },
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

export function addPlayer(name: string, avatar: string) {
  const player = db.insert(players).values({ name, avatar, isOwner: false }).returning().get();
  notifyDbChanged();
  return player;
}

/**
 * Removes a crew member (never the owner). Cascades to their game entries and scores; any game
 * left with no players at all is deleted too.
 */
export function removePlayer(id: number) {
  db.transaction((tx) => {
    tx.delete(players)
      .where(and(eq(players.id, id), eq(players.isOwner, false)))
      .run();
    tx.delete(games)
      .where(notExists(tx.select().from(gamePlayers).where(eq(gamePlayers.gameId, games.id))))
      .run();
  });
  notifyDbChanged();
}

export function getPlayer(id: number) {
  return db.query.players.findFirst({ where: eq(players.id, id) });
}

/** Edits a player (owner included). `isOwner` is never changed here. */
export function updatePlayer(
  id: number,
  values: { name: string; avatar: string; photo: string | null; handicap: number | null },
) {
  const player = db.update(players).set(values).where(eq(players.id, id)).returning().get();
  notifyDbChanged();
  return player;
}

/** History tab: every finished game, most recently finished first. */
export function listCompletedGames() {
  return db.query.games.findMany({
    where: eq(games.status, 'completed'),
    with: gameDetail,
    orderBy: [desc(games.completedAt), desc(games.id)],
  });
}

/** Every non-abandoned game with full detail, newest first (stats are computed in JS). */
export function listGamesForStats() {
  return db.query.games.findMany({
    where: ne(games.status, 'abandoned'),
    with: gameDetail,
    orderBy: [desc(games.startedAt), desc(games.id)],
  });
}

/**
 * Starts a round on a course with players in turn order. Only one round is live at a time
 * (as in the prototype), so any other in-progress round is marked abandoned, not deleted.
 */
export function startGame(courseId: number, playerIds: number[]) {
  if (playerIds.length === 0) throw new Error('Pick at least one player');
  const game = db.transaction((tx) => {
    const course = tx.query.courses
      .findFirst({ where: eq(courses.id, courseId), with: { venue: true, holes: { orderBy: [asc(holes.number)] } } })
      .sync();
    if (!course) throw new Error('Course not found');
    if (course.holes.length === 0) throw new Error('This course has no holes');
    tx.update(games).set({ status: 'abandoned' }).where(eq(games.status, 'in_progress')).run();
    const created = tx
      .insert(games)
      .values({
        courseId,
        courseName: course.name,
        venueName: course.venue.name,
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning()
      .get();
    // Snapshot the layout: the game keeps these pars even if the course is edited later.
    tx.insert(gameHoles)
      .values(
        course.holes.map((h) => ({
          gameId: created.id,
          holeId: h.id,
          number: h.number,
          par: h.par,
          length: h.length,
          difficulty: h.difficulty,
        })),
      )
      .run();
    tx.insert(gamePlayers)
      .values(playerIds.map((playerId, position) => ({ gameId: created.id, playerId, position })))
      .run();
    return created;
  });
  notifyDbChanged();
  return game;
}

/** Upserts a player's strokes on one of the game's holes (game_holes.id); 0 clears the score ("–"). */
export function setScore(gameId: number, playerId: number, gameHoleId: number, strokes: number) {
  if (strokes <= 0) {
    db.delete(scores)
      .where(and(eq(scores.gameId, gameId), eq(scores.playerId, playerId), eq(scores.gameHoleId, gameHoleId)))
      .run();
  } else {
    db.insert(scores)
      .values({ gameId, playerId, gameHoleId, strokes })
      .onConflictDoUpdate({
        target: [scores.gameId, scores.playerId, scores.gameHoleId],
        set: { strokes, updatedAt: new Date() },
      })
      .run();
  }
  notifyDbChanged();
}

/** The game, if it is still being played (players can only change on a live round). */
function liveGameOrThrow(tx: Tx, gameId: number) {
  const game = tx.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) throw new Error('Game not found');
  if (game.status !== 'in_progress') throw new Error('Players can only change during a live round');
  return game;
}

/**
 * "Edit players" during a round: adds a saved player at the end of the turn order. They start with
 * no scores (holes already played show "–" until filled in). No-op if they are already playing.
 */
export function addPlayerToGame(gameId: number, playerId: number) {
  db.transaction((tx) => {
    liveGameOrThrow(tx, gameId);
    const current = tx.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId)).all();
    if (current.some((gp) => gp.playerId === playerId)) return;
    if (current.length >= MAX_PLAYERS) throw new Error(`A round has at most ${MAX_PLAYERS} players`);
    const position = current.reduce((last, gp) => Math.max(last, gp.position), -1) + 1;
    tx.insert(gamePlayers).values({ gameId, playerId, position }).run();
  });
  notifyDbChanged();
}

/**
 * "Edit players" during a round: takes a player out of the game and deletes their scores for THIS
 * game only (other games and the saved player are untouched). The remaining players keep their
 * order with positions renumbered 0..n-1. A round always keeps at least one player.
 * Returns how many scores were deleted.
 */
export function removePlayerFromGame(gameId: number, playerId: number) {
  const deleted = db.transaction((tx) => {
    liveGameOrThrow(tx, gameId);
    const current = tx
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId))
      .orderBy(asc(gamePlayers.position))
      .all();
    if (!current.some((gp) => gp.playerId === playerId)) return 0;
    if (current.length <= 1) throw new Error('A round needs at least one player');
    const removedScores = tx
      .delete(scores)
      .where(and(eq(scores.gameId, gameId), eq(scores.playerId, playerId)))
      .returning({ id: scores.id })
      .all().length;
    tx.delete(gamePlayers)
      .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, playerId)))
      .run();
    // Close the gap in ascending order, so each move goes into a slot that is already free
    // (positions are unique per game).
    current
      .filter((gp) => gp.playerId !== playerId)
      .forEach((gp, position) => {
        if (gp.position !== position) {
          tx.update(gamePlayers)
            .set({ position })
            .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, gp.playerId)))
            .run();
        }
      });
    return removedScores;
  });
  notifyDbChanged();
  return deleted;
}

/** Confirmed result: only a live round can be completed (status=completed, completedAt=now). */
export function completeGame(id: number) {
  db.update(games)
    .set({ status: 'completed', completedAt: new Date() })
    .where(and(eq(games.id, id), eq(games.status, 'in_progress')))
    .run();
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes a course's hole layout IN PLACE: holes are matched by number and updated, new numbers
 * inserted, and only holes beyond the new count deleted. Games are unaffected either way: they
 * play on their own game_holes snapshot (a deleted hole only nulls game_holes.hole_id).
 */
function writeHoles(tx: Tx, courseId: number, layout: HoleInput[]) {
  const existing = tx.select().from(holes).where(eq(holes.courseId, courseId)).all();
  layout.forEach((hole, i) => {
    const number = i + 1;
    const row = existing.find((h) => h.number === number);
    if (row) tx.update(holes).set(hole).where(eq(holes.id, row.id)).run();
    else tx.insert(holes).values({ ...hole, courseId, number }).run();
  });
  tx.delete(holes)
    .where(and(eq(holes.courseId, courseId), gt(holes.number, layout.length)))
    .run();
}

/** Step 3: create (or update) the onboarding course and its holes. */
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
    writeHoles(tx, row.id, values.holes);
    return row;
  });
  setMeta('onboarding_course_id', String(course.id));
  notifyDbChanged();
  return course;
}

/** Adds a course with its holes to an existing venue (venue detail / New game). */
export function createCourse(venueId: number, values: { name: string; image: string | null; holes: HoleInput[] }) {
  const course = db.transaction((tx) => {
    const row = tx.insert(courses).values({ venueId, name: values.name, image: values.image }).returning().get();
    writeHoles(tx, row.id, values.holes);
    return row;
  });
  notifyDbChanged();
  return course;
}

/** Course edit screen: name, photo and hole layout (in place, see writeHoles). */
export function updateCourse(id: number, values: { name: string; image: string | null; holes: HoleInput[] }) {
  db.transaction((tx) => {
    tx.update(courses).set({ name: values.name, image: values.image }).where(eq(courses.id, id)).run();
    writeHoles(tx, id, values.holes);
  });
  notifyDbChanged();
}

export function getCourse(id: number) {
  return db.query.courses.findFirst({
    where: eq(courses.id, id),
    with: { venue: true as const, holes: { orderBy: [asc(holes.number)] } },
  });
}

/** Games (not abandoned) played on a course; they keep their own layout when it is edited. */
export function countCourseGames(courseId: number) {
  const row = db
    .select({ n: count() })
    .from(games)
    .where(and(eq(games.courseId, courseId), ne(games.status, 'abandoned')))
    .get();
  return row?.n ?? 0;
}

/** Games played at a venue (all its courses), newest first. Abandoned games are hidden. */
export function listVenueGames(venueId: number) {
  return db.query.games.findMany({
    where: and(
      ne(games.status, 'abandoned'),
      inArray(games.courseId, db.select({ id: courses.id }).from(courses).where(eq(courses.venueId, venueId))),
    ),
    with: gameDetail,
    orderBy: [desc(games.startedAt), desc(games.id)],
  });
}

/**
 * Step 4 "Create": everything (owner, venue, course, crew) is already saved, so this only marks
 * onboarding complete. No game is created; Home starts with no round in progress.
 */
export function finishOnboarding() {
  setMeta('onboarding', 'complete');
  notifyDbChanged();
}

// ---------------------------------------------------------------------------
// Venue stats (aggregates from SQL, combined by the pure functions in lib/venue-stats)
// ---------------------------------------------------------------------------

export async function loadVenueSummaries() {
  const [venueRows, aggregates, totals, owner] = await Promise.all([
    listVenues(),
    courseGameAggregates(),
    completedRoundTotals(),
    getOwner(),
  ]);
  return venueRows.map((v) => summarizeVenue(v, aggregates, totals, owner?.id ?? null));
}

export async function loadVenueSummary(id: number) {
  const [venue, aggregates, totals, owner] = await Promise.all([
    getVenue(id),
    courseGameAggregates(),
    completedRoundTotals(),
    getOwner(),
  ]);
  return venue ? summarizeVenue(venue, aggregates, totals, owner?.id ?? null) : null;
}
