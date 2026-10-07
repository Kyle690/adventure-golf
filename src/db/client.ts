import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'adventure-golf.db';

function createDb(expoDb: SQLiteDatabase) {
  return drizzle(expoDb, { schema });
}
export type Database = ReturnType<typeof createDb>;

/**
 * The Drizzle client. Assigned by initDatabase() before any screen renders
 * (DatabaseProvider gates the tree), so screens and queries can import it directly.
 */
export let db: Database;
export let expoDb: SQLiteDatabase;

let opening: Promise<Database> | null = null;

/**
 * Opens the SQLite file. It's opened asynchronously because on web expo-sqlite has to boot its
 * wasm worker before the synchronous API can be used; on iOS/Android this is just a normal open.
 */
export function initDatabase(): Promise<Database> {
  opening ??= (async () => {
    expoDb = await openDatabaseAsync(DATABASE_NAME);
    // SQLite does not enforce FKs (and so cascades) unless enabled per connection.
    await expoDb.execAsync('PRAGMA foreign_keys = ON;');
    db = createDb(expoDb);
    return db;
  })();
  return opening;
}
