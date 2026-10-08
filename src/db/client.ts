import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { type Database, setDatabase } from './database';
import * as schema from './schema';

export type { Database } from './database';
export const DATABASE_NAME = 'adventure-golf.db';

export let expoDb: SQLiteDatabase;

let opening: Promise<Database> | null = null;

/**
 * Opens the SQLite file. It's opened asynchronously because on web expo-sqlite has to boot its
 * wasm worker before the synchronous API can be used; on iOS/Android this is just a normal open.
 *
 * Foreign keys stay OFF while migrations run: SQLite ignores PRAGMA foreign_keys inside the
 * migrator's transaction, and table rebuilds (DROP TABLE + rename) would otherwise cascade-delete
 * child rows. DatabaseProvider calls enableForeignKeys() once migrations have succeeded.
 */
export function initDatabase(): Promise<Database> {
  opening ??= (async () => {
    expoDb = await openDatabaseAsync(DATABASE_NAME);
    await expoDb.execAsync('PRAGMA foreign_keys = OFF;');
    const database = drizzle(expoDb, { schema });
    setDatabase(database);
    return database;
  })();
  return opening;
}

/** SQLite only enforces FKs (and so cascades) when enabled per connection. */
export async function enableForeignKeys() {
  await expoDb.execAsync('PRAGMA foreign_keys = ON;');
}
