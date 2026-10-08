import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** First-run onboarding: owner -> venue -> course -> crew carousel, then the completion recap. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: colors.cream } }}
    >
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="onboarding/complete" />
    </Stack>
  );
}
