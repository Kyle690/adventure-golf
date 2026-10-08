import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncingBall } from '@/components/celebration/BouncingBall';
import { Confetti } from '@/components/celebration/Confetti';
import { Eyebrow } from '@/components/Eyebrow';
import { GolfBall } from '@/components/GolfBall';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

export type CelebrationProps = {
  /** Small green label above the title ("ONBOARDING COMPLETE", "ROUND COMPLETE"). */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Content of the white recap card (omit for no card). */
  card?: ReactNode;
  /** Buttons under the card. */
  actions?: ReactNode;
  /** Rendered first, underneath everything (e.g. a view captured for sharing). */
  behind?: ReactNode;
};

/**
 * The animated celebration: deep green backdrop with leaves and golf balls, a ball bouncing next to
 * the flag, the copy and recap card sliding in, then falling confetti. Used full screen by the
 * onboarding complete screen and as an overlay when a round is confirmed (CelebrationOverlay).
 */
export function Celebration({ eyebrow, title, subtitle, card, actions, behind }: CelebrationProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      {behind}
      <View style={styles.screen}>
        <LinearGradient
          colors={['rgba(105,183,52,0.18)', 'transparent']}
          locations={[0, 0.55]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LeafDecoration />
        <GolfBall size={26} style={{ top: 120, left: 26, opacity: 0.7 }} />
        <GolfBall size={18} style={{ top: 210, right: 30, opacity: 0.55 }} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(22, insets.top), paddingBottom: insets.bottom + 28 },
          ]}
        >
          <Logo style={{ alignSelf: 'center' }} />
          <BouncingBall />

          <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.copy}>
            <Eyebrow style={{ marginBottom: 9, color: '#90ce5e', textAlign: 'center' }}>{eyebrow}</Eyebrow>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </Animated.View>

          {card ? (
            <Animated.View entering={FadeInDown.duration(500).delay(320)} style={styles.card}>
              {card}
            </Animated.View>
          ) : null}

          {actions ? <Animated.View entering={FadeInDown.duration(500).delay(480)}>{actions}</Animated.View> : null}
        </ScrollView>
        <Confetti />
      </View>
    </View>
  );
}

/**
 * The celebration presented over the current screen (full-screen modal; on web it keeps to the
 * 470px app column). Android back / Escape call onRequestClose.
 */
export function CelebrationOverlay({
  visible,
  onRequestClose,
  ...props
}: CelebrationProps & { visible: boolean; onRequestClose: () => void }) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent transparent>
      <View style={styles.shell}>
        <View style={styles.column} accessibilityViewIsModal>
          <Celebration {...props} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, overflow: 'hidden', backgroundColor: colors.deep },
  shell: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? 'rgba(2, 30, 32, 0.62)' : colors.deep },
  column: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 470 : undefined, overflow: 'hidden' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  copy: { alignItems: 'center', marginTop: 22 },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 34, lineHeight: 40, textAlign: 'center' },
  subtitle: {
    marginTop: 9,
    maxWidth: 300,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  // Same white card treatment as the Home "round in progress" card.
  card: {
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#fff',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
  },
});
