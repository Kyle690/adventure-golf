import { Tabs } from 'expo-router/js-tabs';

import { BottomNav } from '@/components/BottomNav';

/** Bottom tabs with the prototype's floating nav pill as a custom tab bar. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomNav {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="venues" options={{ title: 'Venues' }} />
      <Tabs.Screen name="players" options={{ title: 'Players' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
