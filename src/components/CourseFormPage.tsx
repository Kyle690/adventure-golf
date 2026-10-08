import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

export function goBackTo(fallback: '/venues' | `/venue/${number}`) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** Header + scroll shell shared by the course create and edit screens. */
export function CourseFormPage({
  eyebrow,
  title,
  subtitle,
  onBack,
  children,
}: PropsWithChildren<{ eyebrow: string; title: string; subtitle: string; onBack: () => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={onBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>{eyebrow}</Eyebrow>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  );
}

export const courseFormPageStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { textAlign: 'center', color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 21,
    paddingBottom: 25,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  roundButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { marginTop: 6, maxWidth: 310, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 20, paddingHorizontal: 20 },
});
