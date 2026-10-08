import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  venues: { label: 'Venues', icon: 'pin' },
  players: { label: 'Players', icon: 'users' },
  history: { label: 'History', icon: 'history' },
};

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Floating bottom navigation pill (prototype .bottom-nav), used as the (tabs) navigator's custom
 * tab bar. Pressing the focused tab again pops its stack to the top (native tab behaviour).
 */
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View style={[styles.nav, { bottom: Math.max(10, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const isActive = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isActive && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityLabel={item.label}
            key={route.key}
            onPress={onPress}
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
