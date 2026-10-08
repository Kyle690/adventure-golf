import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Any synchronous Drizzle SQLite database with our schema: expo-sqlite in the app (client.ts),
 * sql.js in the node tests. queries.ts only depends on this, so the data layer can be tested
 * without React Native.
 */
export type Database = BaseSQLiteDatabase<'sync', any, typeof schema>;

/** Assigned by initDatabase() (or a test) before any query runs. */
export let db: Database;

export function setDatabase(next: Database) {
  db = next;
}
