import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';

import { Icon } from '@/components/Icon';
import { colors, fonts } from '@/theme';

/** Full-width red call to action with a trailing arrow (prototype .wide-cta). */
export function WideCta({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.cta, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <Icon name="arrow" size={20} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginTop: 27,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.red,
    boxShadow: '0 9px 20px rgba(237, 27, 59, 0.2)',
  },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.99 }] },
  label: { color: '#fff', fontSize: 13, fontFamily: fonts.bodyBold },
});
