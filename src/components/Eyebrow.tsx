import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { Text } from '@/components/Text';

import { fonts } from '@/theme';

/**
 * Small uppercase tracking label (prototype .eyebrow: 10px / 700 / 0.18em).
 * Letter spacing scales with an overridden fontSize unless set explicitly.
 */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 10;
  return (
    <Text
      style={[
        styles.eyebrow,
        { fontSize, lineHeight: fontSize, letterSpacing: flat.letterSpacing ?? fontSize * 0.18 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bodyBold },
});
