import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

/**
 * Text with the prototype's default line height (Tailwind preflight sets `line-height: 1.5`
 * on the document). An explicit lineHeight in `style` still wins.
 */
export function Text({ style, ...rest }: TextProps) {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  return <RNText {...rest} style={[{ lineHeight: Math.round(fontSize * 1.5) }, style]} />;
}
