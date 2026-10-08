import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** "Summit Pin" wordmark, 633x120 @3x. `logo.png` is light-on-ink (dark headers), `logo-dark.png` full colour (light screens). */
const LOGO_LIGHT = require('@/assets/images/logo.png');
const LOGO_DARK = require('@/assets/images/logo-dark.png');
const ASPECT = 633 / 120;

/**
 * Adventure Golf wordmark. 211x40 by default; `compact` (169x32) fits the header bars between two
 * round buttons; `width` sets any other size (height follows the aspect ratio).
 * `tone="dark"` is the full-colour version for light/cream backgrounds (every header is dark today).
 */
export function Logo({
  compact = false,
  width,
  tone = 'light',
  style,
}: {
  compact?: boolean;
  width?: number;
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}) {
  const w = width ?? (compact ? 169 : 211);
  return (
    <View style={[styles.logo, { width: w, height: Math.round(w / ASPECT) }, style]}>
      <Image
        source={tone === 'dark' ? LOGO_DARK : LOGO_LIGHT}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="Adventure Golf"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { overflow: 'hidden', zIndex: 2 },
  image: { width: '100%', height: '100%' },
});
