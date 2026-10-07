import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const logo = require('@/assets/images/adventure-golf-logo.png');

/** Adventure Golf wordmark. 113x60 by default, 91x48 when compact (prototype .logo / .logo--compact). */
export function Logo({ compact = false, style }: { compact?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[compact ? styles.compact : styles.logo, style]}>
      <Image source={logo} style={styles.image} contentFit="contain" accessibilityLabel="Adventure Golf" />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 113, height: 60, overflow: 'hidden', zIndex: 2 },
  compact: { width: 91, height: 48, overflow: 'hidden', zIndex: 2 },
  image: { width: '100%', height: '100%' },
});
