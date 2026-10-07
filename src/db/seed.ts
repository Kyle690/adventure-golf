import { eq } from 'drizzle-orm';

import type { Database } from './client';
import { appMeta } from './schema';

const SEED_KEY = 'seed_version';
export const SEED_VERSION = '1';

/** Idempotent first-run seed. Prototype data gets inserted here in one transaction. */
export async function seedDatabase(db: Database) {
  const existing = await db.select().from(appMeta).where(eq(appMeta.key, SEED_KEY));
  if (existing[0]?.value === SEED_VERSION) return;

  await db.transaction(async (tx) => {
    // TODO: insert the prototype's venues, courses, holes and players (exactly one isOwner)
    // once the Figma Make source is readable. Not invented here on purpose.
    await tx
      .insert(appMeta)
      .values({ key: SEED_KEY, value: SEED_VERSION })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: SEED_VERSION } });
  });
}
