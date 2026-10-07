import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedDatabase } from './seed';

/** Applies bundled Drizzle migrations, seeds on first run, then renders the app. */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    seedDatabase(db)
      .then(() => setSeeded(true))
      .catch((e: unknown) => setSeedError(e instanceof Error ? e : new Error(String(e))));
  }, [success]);

  const failure = error ?? seedError;
  if (failure) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Database error: {failure.message}</Text>
      </View>
    );
  }

  if (!success || !seeded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#b91c1c', textAlign: 'center' },
});
