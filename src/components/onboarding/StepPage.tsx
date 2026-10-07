import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

/**
 * One full-screen onboarding step: dark green leafy header (as on the Game/Players headers)
 * over the cream body. `topBar` (back / logo / progress dots) sits at the top of the header.
 */
export function StepPage({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  topBar,
  children,
}: {
  step: number;
  total: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  topBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const top = Math.max(16, insets.top);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
    >
      <View style={[styles.header, { paddingTop: top }]}>
        <LeafDecoration />
        <View style={styles.topBar}>{topBar}</View>
        <Eyebrow style={{ marginBottom: 7, color: '#90ce5e' }}>
          {`STEP ${step} OF ${total} · ${eyebrow}`}
        </Eyebrow>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 27,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  topBar: { height: 38, marginBottom: 28 },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { marginTop: 6, maxWidth: 300, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 20, paddingHorizontal: 20 },
});
