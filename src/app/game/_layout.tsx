import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Game flow, presented over the tabs: new (venue & course) -> players -> [id] (scoring) ->
 * [id]/complete (confirm result / review). No initialRouteName: "Play" on a venue course opens
 * straight at players, and back from there returns to the venue.
 */
export default function GameLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}
