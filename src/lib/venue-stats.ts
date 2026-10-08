/**
 * Venue / course stats (pure functions, no app imports; unit tested in venue-stats.test.ts).
 * Inputs come from Drizzle: listVenues() for venues/courses/holes, courseGameAggregates()
 * (games played + last played per course, SQL GROUP BY) and completedRoundTotals()
 * (strokes per player per finished game, SQL GROUP BY).
 */

export type CourseInput = { id: number; name: string; image: string | null; holes: { par: number }[] };
export type VenueInput = {
  id: number;
  name: string;
  address: string | null;
  image: string | null;
  courses: CourseInput[];
};
export type CourseAggregate = { courseId: number | null; gamesPlayed: number | null; lastPlayed: number | null };
/** Per player per finished game, from the game's hole snapshot: holes = holes scored, roundHoles = holes in that round. */
export type RoundTotal = {
  gameId: number;
  playerId: number;
  courseId: number | null;
  total: number;
  par: number;
  holes: number;
  roundHoles: number;
};

export type BestScore = { total: number; vsPar: number; playerId: number; courseId: number; courseName: string };

export type CourseSummary = {
  id: number;
  name: string;
  image: string | null;
  holes: number;
  par: number;
  gamesPlayed: number;
  lastPlayed: Date | null;
  /** Lowest full-round total by anyone. */
  best: BestScore | null;
  /** Owner's lowest full-round total. */
  ownerBest: BestScore | null;
};

export type VenueSummary = {
  id: number;
  name: string;
  address: string | null;
  image: string | null;
  courseCount: number;
  holeCount: number;
  gamesPlayed: number;
  lastPlayed: Date | null;
  ownerBest: BestScore | null;
  courses: CourseSummary[];
};

export type VenueSort = 'name' | 'played' | 'recent';

const lower = (a: BestScore | null, b: BestScore | null) => (!a ? b : !b ? a : b.total < a.total ? b : a);

/**
 * Summaries per course. Best scores only count FULL rounds (the player scored every hole of that
 * round's own layout), so a round abandoned half-way through can't look like a record. Par and
 * vs-par come from the round's snapshot, so editing the course doesn't rewrite old bests.
 */
export function summarizeCourse(
  course: CourseInput,
  aggregates: CourseAggregate[],
  totals: RoundTotal[],
  ownerId: number | null,
): CourseSummary {
  const agg = aggregates.find((a) => a.courseId === course.id);
  const holeCount = course.holes.length;
  let best: BestScore | null = null;
  let ownerBest: BestScore | null = null;
  for (const t of totals) {
    if (t.courseId !== course.id || t.roundHoles === 0 || t.holes !== t.roundHoles) continue;
    const score: BestScore = {
      total: t.total,
      vsPar: t.total - t.par,
      playerId: t.playerId,
      courseId: course.id,
      courseName: course.name,
    };
    best = lower(best, score);
    if (t.playerId === ownerId) ownerBest = lower(ownerBest, score);
  }
  return {
    id: course.id,
    name: course.name,
    image: course.image,
    holes: holeCount,
    par: course.holes.reduce((sum, h) => sum + h.par, 0),
    gamesPlayed: Number(agg?.gamesPlayed ?? 0),
    lastPlayed: agg?.lastPlayed != null ? new Date(Number(agg.lastPlayed) * 1000) : null,
    best,
    ownerBest,
  };
}

export function summarizeVenue(
  venue: VenueInput,
  aggregates: CourseAggregate[],
  totals: RoundTotal[],
  ownerId: number | null,
): VenueSummary {
  const courses = venue.courses.map((c) => summarizeCourse(c, aggregates, totals, ownerId));
  const last = courses.reduce<Date | null>(
    (latest, c) => (c.lastPlayed && (!latest || c.lastPlayed > latest) ? c.lastPlayed : latest),
    null,
  );
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    image: venue.image,
    courseCount: courses.length,
    holeCount: courses.reduce((sum, c) => sum + c.holes, 0),
    gamesPlayed: courses.reduce((sum, c) => sum + c.gamesPlayed, 0),
    lastPlayed: last,
    ownerBest: courses.reduce<BestScore | null>((b, c) => lower(b, c.ownerBest), null),
    courses,
  };
}

/** name: A-Z; played: most finished games first; recent: most recently played first (never-played last). */
export function sortVenues(list: VenueSummary[], key: VenueSort): VenueSummary[] {
  const byName = (a: VenueSummary, b: VenueSummary) => a.name.localeCompare(b.name);
  return [...list].sort((a, b) => {
    if (key === 'played') return b.gamesPlayed - a.gamesPlayed || byName(a, b);
    if (key === 'recent') {
      const at = a.lastPlayed?.getTime() ?? -Infinity;
      const bt = b.lastPlayed?.getTime() ?? -Infinity;
      return bt - at || byName(a, b);
    }
    return byName(a, b);
  });
}
