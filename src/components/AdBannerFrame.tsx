import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

/** Shared chrome around a banner: a quiet "AD" label and a small "Remove ads" link. */
export function AdBannerFrame({ children }: PropsWithChildren) {
  return (
    <View style={styles.wrap}>
      <View style={styles.meta}>
        <Text style={styles.label}>ADVERTISEMENT</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Go ad-free" hitSlop={8} onPress={() => router.push('/remove-ads')}>
          <Text style={styles.link}>Remove ads</Text>
        </Pressable>
      </View>
      <View style={styles.slot}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginBottom: 6 },
  label: { color: '#9aa69f', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.1 },
  link: { color: colors.green, fontSize: 10, fontFamily: fonts.bodyBold },
  slot: { alignItems: 'center', overflow: 'hidden' },
});
