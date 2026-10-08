/// <reference types="node" />
/**
 * Data-layer tests against a real SQLite (sql.js, in-memory) with the app's Drizzle migrations:
 * - upgrading a previous-build database (migrations 0000-0001 + demo data) through 0002 keeps
 *   every game, score and stat intact
 * - editing a course after a completed game never changes that game (game_holes snapshot)
 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { before, describe, it } from 'node:test';

import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import { PreparedQuery, SQLJsSession } from 'drizzle-orm/sql-js/session';
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js';

import { calculateHandicap } from '../lib/handicap';
import { gameResults, scoreGrid } from '../lib/game';
import { playerStats } from '../lib/stats';
import { type Database, setDatabase } from './database';
import { SEED } from './demo-seed';
import * as q from './queries';
import * as schema from './schema';

// Test-only workaround: drizzle-orm 0.45's sql.js session drops the relational-query result mapper
// (prepareQuery ignores its 5th argument), so `db.query.*` would return raw rows. Pass it through.
(SQLJsSession.prototype as any).prepareQuery = function (this: any, ...args: any[]) {
  const [query, fields, executeMethod, isResponseInArrayMode, customResultMapper] = args;
  return new PreparedQuery(this.client, query, this.logger, fields, executeMethod, isResponseInArrayMode, customResultMapper);
};

const MIGRATIONS = path.resolve(__dirname, '../../drizzle');
let SQL: SqlJsStatic;
before(async () => {
  SQL = await initSqlJs();
});

/** A copy of the migrations folder whose journal stops after `count` migrations. */
function migrationsUpTo(count: number) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ag-migrations-'));
  cpSync(MIGRATIONS, dir, { recursive: true });
  const journalPath = path.join(dir, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  journal.entries = journal.entries.slice(0, count);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

function open(sqlite: SqlJsDatabase) {
  const database = drizzle(sqlite, { schema });
  setDatabase(database as unknown as Database);
  return database;
}

/** Same order as the app: FKs off while migrating (table rebuilds), on afterwards. */
function upgrade(sqlite: SqlJsDatabase, migrationsFolder = MIGRATIONS) {
  sqlite.run('PRAGMA foreign_keys = OFF');
  migrate(drizzle(sqlite, { schema }), { migrationsFolder });
  sqlite.run('PRAGMA foreign_keys = ON');
}

const rows = (sqlite: SqlJsDatabase, query: string) => {
  const result = sqlite.exec(query)[0];
  if (!result) return [];
  return result.values.map((v) => Object.fromEntries(result.columns.map((c, i) => [c, v[i]])));
};

/** Previous build: schema 0000-0001 and its demo seed (scores keyed by holes.id). */
function previousBuildWithDemoData() {
  const sqlite = new SQL.Database();
  sqlite.run('PRAGMA foreign_keys = OFF');
  migrate(drizzle(sqlite), { migrationsFolder: migrationsUpTo(2) });
  sqlite.run('PRAGMA foreign_keys = ON'); // the previous build enabled FKs at open
  const day = 24 * 60 * 60;
  const now = Math.floor(Date.UTC(2026, 9, 8, 12) / 1000);
  sqlite.run(`INSERT INTO venues (id, name, address) VALUES (1, '${SEED.venue.name}', '${SEED.venue.address}')`);
  sqlite.run(`INSERT INTO courses (id, venue_id, name) VALUES (1, 1, '${SEED.course.name}')`);
  SEED.pars.forEach((par, i) => sqlite.run(`INSERT INTO holes (id, course_id, number, par) VALUES (${i + 1}, 1, ${i + 1}, ${par})`));
  SEED.players.forEach((p, i) =>
    sqlite.run(`INSERT INTO players (id, name, avatar, is_owner) VALUES (${i + 1}, '${p.name}', '${p.avatar}', ${p.isOwner ? 1 : 0})`),
  );
  sqlite.run(`INSERT INTO games (id, course_id, started_at, completed_at, status) VALUES (1, 1, ${now - 21 * day - 3300}, ${now - 21 * day}, 'completed')`);
  sqlite.run(`INSERT INTO games (id, course_id, started_at, status) VALUES (2, 1, ${now - 3600}, 'in_progress')`);
  for (const [gameId, strokes] of [[1, SEED.lastGameScores], [2, SEED.liveGameScores]] as const) {
    SEED.players.forEach((_, p) => {
      sqlite.run(`INSERT INTO game_players (game_id, player_id, position) VALUES (${gameId}, ${p + 1}, ${p})`);
      strokes[p].forEach((s, h) =>
        sqlite.run(`INSERT INTO scores (game_id, player_id, hole_id, strokes) VALUES (${gameId}, ${p + 1}, ${h + 1}, ${s})`),
      );
    });
  }
  sqlite.run(`INSERT INTO app_meta (key, value) VALUES ('onboarding', 'complete')`);
  return sqlite;
}

describe('migration 0002 (game snapshots) on a previous-build database', () => {
  it('backfills game_holes and names, remaps scores, and leaves stats unchanged', async () => {
    const sqlite = previousBuildWithDemoData();
    // Stats as the previous build computed them: totals over holes.par of the holes scored.
    const before = rows(
      sqlite,
      `SELECT s.game_id, s.player_id, sum(s.strokes) total, sum(h.par) par, count(*) holes
       FROM scores s JOIN holes h ON h.id = s.hole_id GROUP BY s.game_id, s.player_id ORDER BY 1, 2`,
    );
    const beforeHandicap = (playerId: number) =>
      calculateHandicap(
        before
          .filter((r) => r.game_id === 1 && r.player_id === playerId)
          .map((r) => ({ strokes: Number(r.total), par: Number(r.par), holes: Number(r.holes), date: new Date() })),
      );
    const scoreCount = rows(sqlite, 'SELECT count(*) n FROM scores')[0].n;

    upgrade(sqlite);
    open(sqlite);

    assert.deepEqual(rows(sqlite, 'PRAGMA foreign_key_check'), [], 'no FK violations');
    assert.equal(rows(sqlite, 'SELECT count(*) n FROM scores')[0].n, scoreCount, 'no score lost');
    assert.equal(rows(sqlite, 'SELECT count(*) n FROM game_players')[0].n, 6, 'game players kept');
    assert.deepEqual(
      rows(sqlite, 'SELECT id, course_id, course_name, venue_name, status FROM games ORDER BY id'),
      [
        { id: 1, course_id: 1, course_name: SEED.course.name, venue_name: SEED.venue.name, status: 'completed' },
        { id: 2, course_id: 1, course_name: SEED.course.name, venue_name: SEED.venue.name, status: 'in_progress' },
      ],
    );
    assert.deepEqual(
      rows(sqlite, 'SELECT par FROM game_holes WHERE game_id = 1 ORDER BY number').map((r) => r.par),
      SEED.pars,
    );
    const after = rows(
      sqlite,
      `SELECT s.game_id, s.player_id, sum(s.strokes) total, sum(gh.par) par, count(*) holes
       FROM scores s JOIN game_holes gh ON gh.id = s.game_hole_id GROUP BY s.game_id, s.player_id ORDER BY 1, 2`,
    );
    assert.deepEqual(after, before, 'per-player totals, par and holes identical');

    // App-level stats through the new data layer.
    const games = await q.listGamesForStats();
    for (const player of [1, 2, 3]) {
      assert.equal(playerStats(player, games).handicap, beforeHandicap(player), `handicap of player ${player}`);
    }
    const owner = playerStats(1, games);
    assert.deepEqual(owner.best, { total: 24, courseName: SEED.course.name, vsPar: -5 });
    assert.equal(owner.rounds, 1);
    const [venue] = await q.loadVenueSummaries();
    assert.equal(venue.gamesPlayed, 1);
    assert.equal(venue.ownerBest?.total, 24);
    assert.equal(venue.ownerBest?.vsPar, -5);
    const live = await q.getLiveGame();
    assert.equal(live?.holes.length, 9);
    assert.equal(scoreGrid(live!).filter((hole) => hole.every((s) => s > 0)).length, 4, 'live round resumes on hole 5');
  });

  it('would lose data if run with foreign keys ON (why migrations run with FKs off)', () => {
    const sqlite = previousBuildWithDemoData();
    migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS });
    assert.equal(rows(sqlite, 'SELECT count(*) n FROM game_players')[0].n, 0);
  });
});

describe('course edits never change past games', () => {
  it("keeps a completed game's score sheet, totals, vs par and handicap", async () => {
    const sqlite = new SQL.Database();
    upgrade(sqlite);
    open(sqlite);

    const owner = q.saveOwner({ name: 'Kyle', avatar: '#ed1b3b', handicap: null });
    const friend = q.addPlayer('Alex', '#f1ba28');
    const venue = q.createVenue({ name: 'Sandton', address: null, image: null });
    const course = q.saveCourse({
      venueId: venue.id,
      name: 'Tropical Trail',
      image: null,
      holes: SEED.pars.map((par) => ({ par, length: null, difficulty: null })),
    });
    const game = q.startGame(course.id, [owner.id, friend.id]);
    const started = (await q.getGame(game.id))!;
    started.holes.forEach((hole, h) => {
      q.setScore(game.id, owner.id, hole.id, SEED.lastGameScores[0][h]);
      q.setScore(game.id, friend.id, hole.id, SEED.lastGameScores[1][h]);
    });
    q.completeGame(game.id);

    const snapshot = async () => {
      const g = (await q.getGame(game.id))!;
      const games = await q.listGamesForStats();
      return {
        courseName: g.courseName,
        venueName: g.venueName,
        pars: g.holes.map((h) => h.par),
        grid: scoreGrid(g),
        results: gameResults(g).map((r) => ({ name: r.name, total: r.total, vsPar: r.vsPar, rank: r.rank, isWinner: r.isWinner })),
        ownerStats: playerStats(owner.id, games),
        friendHandicap: playerStats(friend.id, games).handicap,
      };
    };
    const before = await snapshot();
    assert.equal(before.results[0].total, 24);
    assert.equal(before.results[0].vsPar, -5);

    // Rename, change every par and cut the course from 9 to 6 holes.
    q.updateCourse(course.id, {
      name: 'Tropical Trail (new layout)',
      image: null,
      holes: Array.from({ length: 6 }, () => ({ par: 5, length: null, difficulty: null })),
    });
    assert.equal((await q.getCourse(course.id))!.holes.length, 6, 'course really changed');

    const after = await snapshot();
    assert.deepEqual(after, before);
    assert.deepEqual(rows(sqlite, 'PRAGMA foreign_key_check'), []);
    assert.equal(rows(sqlite, 'SELECT count(*) n FROM game_holes WHERE game_id = 1 AND hole_id IS NULL')[0].n, 3, 'removed holes only unlink');

    // New games use the new layout.
    const next = q.startGame(course.id, [owner.id]);
    const nextGame = (await q.getGame(next.id))!;
    assert.deepEqual(nextGame.holes.map((h) => h.par), [5, 5, 5, 5, 5, 5]);
    assert.equal(nextGame.courseName, 'Tropical Trail (new layout)');
  });
});

describe('createCourse', () => {
  it('adds a course with its holes to a venue and shows up in the venue summary', async () => {
    const sqlite = new SQL.Database();
    upgrade(sqlite);
    open(sqlite);
    const venue = q.createVenue({ name: 'Sandton', address: null, image: null });
    const course = q.createCourse(venue.id, {
      name: 'Jungle Run',
      image: null,
      holes: [3, 4, 2, 3, 3, 3].map((par) => ({ par, length: null, difficulty: null })),
    });
    const summary = (await q.loadVenueSummary(venue.id))!;
    assert.equal(summary.courseCount, 1);
    assert.deepEqual(
      summary.courses.map((c) => ({ name: c.name, holes: c.holes, par: c.par, games: c.gamesPlayed })),
      [{ name: 'Jungle Run', holes: 6, par: 18, games: 0 }],
    );
    assert.equal((await q.getCourse(course.id))!.holes.map((h) => h.number).join(','), '1,2,3,4,5,6');
  });
});
