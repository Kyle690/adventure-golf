import { Stack } from 'expo-router';

import { colors } from '@/theme';

// Deep links to a detail screen keep the list underneath.
export const unstable_settings = { initialRouteName: 'index' };

export default function HistoryLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}
