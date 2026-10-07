import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'adventure-golf.db';

export const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

// SQLite does not enforce FKs (and so cascades) unless enabled per connection.
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

export type Database = typeof db;
