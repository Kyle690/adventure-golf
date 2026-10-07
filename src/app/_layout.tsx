import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Fredoka_500Medium, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/db/provider';
import { RoundDraftProvider } from '@/state/round-draft';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Fonts ship inside the app bundle (no network needed), matching the prototype's Google Fonts.
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Fredoka_500Medium,
    Fredoka_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.shell}>
        <View style={styles.app}>
          <DatabaseProvider>
            <RoundDraftProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.cream },
                }}
              />
            </RoundDraftProvider>
          </DatabaseProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // On web the app sits in a centred 470px phone column, like the prototype's .app-shell/.mobile-app.
  shell: { flex: 1, backgroundColor: colors.shell, alignItems: 'center' },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 470 : undefined,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    boxShadow: Platform.OS === 'web' ? '0 0 60px rgba(6, 50, 54, 0.16)' : undefined,
  },
});
