/// <reference types="node" />
/**
 * Test-only helpers: a real SQLite (sql.js, in-memory) migrated with the app's Drizzle migrations
 * and installed as the shared `db`, so queries.ts runs unchanged. Not bundled (only *.test.ts
 * import it).
 */
import path from 'node:path';

import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import { PreparedQuery, SQLJsSession } from 'drizzle-orm/sql-js/session';
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js';

import { type Database, setDatabase } from './database';
import * as schema from './schema';

// Workaround: drizzle-orm 0.45's sql.js session drops the relational-query result mapper
// (prepareQuery ignores its 5th argument), so `db.query.*` would return raw rows. Pass it through.
(SQLJsSession.prototype as any).prepareQuery = function (this: any, ...args: any[]) {
  const [query, fields, executeMethod, isResponseInArrayMode, customResultMapper] = args;
  return new PreparedQuery(this.client, query, this.logger, fields, executeMethod, isResponseInArrayMode, customResultMapper);
};

export const MIGRATIONS = path.resolve(__dirname, '../../drizzle');

let SQL: SqlJsStatic | null = null;
export async function loadSqlJs() {
  SQL ??= await initSqlJs();
  return SQL;
}

/** Installs this database as the app's `db`. */
export function open(sqlite: SqlJsDatabase) {
  const database = drizzle(sqlite, { schema });
  setDatabase(database as unknown as Database);
  return database;
}

/** Same order as the app: FKs off while migrating (table rebuilds), on afterwards. */
export function upgrade(sqlite: SqlJsDatabase, migrationsFolder = MIGRATIONS) {
  sqlite.run('PRAGMA foreign_keys = OFF');
  migrate(drizzle(sqlite, { schema }), { migrationsFolder });
  sqlite.run('PRAGMA foreign_keys = ON');
}

/** A fresh, fully migrated database installed as `db`. */
export async function freshDatabase() {
  const sqlite = new (await loadSqlJs()).Database();
  upgrade(sqlite);
  open(sqlite);
  return sqlite;
}

export const rows = (sqlite: SqlJsDatabase, query: string) => {
  const result = sqlite.exec(query)[0];
  if (!result) return [];
  return result.values.map((v) => Object.fromEntries(result.columns.map((c, i) => [c, v[i]])));
};
