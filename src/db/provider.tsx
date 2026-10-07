import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { type Database, initDatabase } from './client';
import { seedDatabase } from './seed';

/** Opens SQLite, applies bundled Drizzle migrations, seeds on first run, then renders the app. */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const [database, setDatabase] = useState<Database | null>(null);
  const [openError, setOpenError] = useState<Error | null>(null);

  useEffect(() => {
    initDatabase()
      .then(setDatabase)
      .catch((e: unknown) => setOpenError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (openError) return <Failure error={openError} />;
  if (!database) return <Loading />;
  return <Migrated database={database}>{children}</Migrated>;
}

function Migrated({ database, children }: PropsWithChildren<{ database: Database }>) {
  const { success, error } = useMigrations(database, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    seedDatabase(database)
      .then(() => setSeeded(true))
      .catch((e: unknown) => setSeedError(e instanceof Error ? e : new Error(String(e))));
  }, [success, database]);

  const failure = error ?? seedError;
  if (failure) return <Failure error={failure} />;
  if (!success || !seeded) return <Loading />;
  return <>{children}</>;
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color="#188044" />
    </View>
  );
}

function Failure({ error }: { error: Error }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>Database error: {error.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f7f6ed' },
  error: { color: '#b91c1c', textAlign: 'center' },
});
