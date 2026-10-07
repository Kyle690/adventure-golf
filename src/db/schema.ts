import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/** Hole difficulty level (nullable on holes). */
export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const GAME_STATUSES = ['in_progress', 'completed', 'abandoned'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const venues = sqliteTable('venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  /** Local asset key (see src/assets registry) or file URI. */
  image: text('image'),
  createdAt: createdAt(),
});

export const courses = sqliteTable(
  'courses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    venueId: integer('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    image: text('image'),
    createdAt: createdAt(),
  },
  (t) => [index('courses_venue_id_idx').on(t.venueId)],
);

export const holes = sqliteTable(
  'holes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    /** Hole number, also the play order (1-based). */
    number: integer('number').notNull(),
    par: integer('par').notNull(),
    /** Length in metres. */
    length: integer('length'),
    difficulty: text('difficulty', { enum: DIFFICULTY_LEVELS }),
  },
  (t) => [
    uniqueIndex('holes_course_number_uq').on(t.courseId, t.number),
    check('holes_par_positive', sql`${t.par} > 0`),
    check('holes_number_positive', sql`${t.number} > 0`),
  ],
);

export const players = sqliteTable(
  'players',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    /** Local asset key, emoji/initials, or file URI. */
    avatar: text('avatar'),
    handicap: integer('handicap'),
    /** Marks the app's main user. At most one row may be true (partial unique index). */
    isOwner: integer('is_owner', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('players_single_owner_uq').on(t.isOwner).where(sql`${t.isOwner} = 1`)],
);

export const games = sqliteTable(
  'games',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    status: text('status', { enum: GAME_STATUSES }).notNull().default('in_progress'),
  },
  (t) => [
    index('games_course_id_idx').on(t.courseId),
    index('games_status_idx').on(t.status),
    index('games_started_at_idx').on(t.startedAt),
  ],
);

export const gamePlayers = sqliteTable(
  'game_players',
  {
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    /** Turn order within the game (0-based). */
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.playerId] }),
    uniqueIndex('game_players_game_position_uq').on(t.gameId, t.position),
    index('game_players_player_id_idx').on(t.playerId),
  ],
);

export const scores = sqliteTable(
  'scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    holeId: integer('hole_id')
      .notNull()
      .references(() => holes.id, { onDelete: 'cascade' }),
    strokes: integer('strokes').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('scores_game_player_hole_uq').on(t.gameId, t.playerId, t.holeId),
    index('scores_player_id_idx').on(t.playerId),
    index('scores_hole_id_idx').on(t.holeId),
    check('scores_strokes_positive', sql`${t.strokes} > 0`),
  ],
);

/** Key/value app metadata (seed version etc.). */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const venuesRelations = relations(venues, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  venue: one(venues, { fields: [courses.venueId], references: [venues.id] }),
  holes: many(holes),
  games: many(games),
}));

export const holesRelations = relations(holes, ({ one, many }) => ({
  course: one(courses, { fields: [holes.courseId], references: [courses.id] }),
  scores: many(scores),
}));

export const playersRelations = relations(players, ({ many }) => ({
  gamePlayers: many(gamePlayers),
  scores: many(scores),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  course: one(courses, { fields: [games.courseId], references: [courses.id] }),
  gamePlayers: many(gamePlayers),
  scores: many(scores),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  player: one(players, { fields: [gamePlayers.playerId], references: [players.id] }),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  game: one(games, { fields: [scores.gameId], references: [games.id] }),
  player: one(players, { fields: [scores.playerId], references: [players.id] }),
  hole: one(holes, { fields: [scores.holeId], references: [holes.id] }),
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Hole = typeof holes.$inferSelect;
export type NewHole = typeof holes.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
