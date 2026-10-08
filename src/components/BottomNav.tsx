import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

export type NavTab = 'home' | 'setup' | 'players';

const ITEMS: { label: string; icon: IconName; tab: NavTab; href: '/' | '/setup' | '/crew' }[] = [
  { label: 'Home', icon: 'home', tab: 'home', href: '/' },
  { label: 'Venues', icon: 'pin', tab: 'setup', href: '/setup' },
  // Players tab = the crew list with stats; the round's player picker (/players) is part of New game.
  { label: 'Players', icon: 'users', tab: 'players', href: '/crew' },
  // The prototype's History tab routes to Home (no history screen yet).
  { label: 'History', icon: 'history', tab: 'home', href: '/' },
];

/** Floating bottom navigation pill (prototype .bottom-nav). */
export function BottomNav({ active }: { active: NavTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { bottom: Math.max(10, insets.bottom) }]}>
      {ITEMS.map((item) => {
        const isActive = active === item.tab;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            key={item.label}
            onPress={() => router.dismissTo(item.href)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Icon name={item.icon} size={21} color={isActive ? colors.green : '#9aa49f'} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bottom padding that keeps scroll content clear of the nav (prototype .with-nav). */
export const NAV_CLEARANCE = 94;

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    zIndex: 20,
    left: 12,
    right: 12,
    height: 70,
    flexDirection: 'row',
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(8, 61, 64, 0.08)',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 10px 28px rgba(8, 61, 64, 0.15)',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 17 },
  itemActive: { backgroundColor: '#edf3e9' },
  label: { fontSize: 8, fontFamily: fonts.bodySemi, color: '#9aa49f' },
  labelActive: { color: colors.ink },
});
