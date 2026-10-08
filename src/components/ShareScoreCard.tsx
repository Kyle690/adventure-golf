import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Icon } from '@/components/Icon';
import { ScoreCardImage, SCORE_CARD_WIDTH } from '@/components/ScoreCardImage';
import { Text } from '@/components/Text';
import type { GameDetail } from '@/db/queries';
import { shareImage, shareText } from '@/lib/share-image';
import { scoreCardFileName, scoreCardText } from '@/lib/scorecard';
import { colors, fonts } from '@/theme';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * "Share score card": renders <ScoreCardImage> only while sharing, captures it to a PNG
 * (react-native-view-shot) and opens the share sheet (see lib/share-image; web shares the file
 * or downloads it). If the image can't be made, the score card is shared as text instead.
 *
 * Render `capture` as the FIRST child of a screen whose content is opaque: the card is laid out
 * on screen (so it can be captured on every platform) but hidden underneath.
 */
export function useScoreCardShare(game: GameDetail | null | undefined) {
  const cardRef = useRef<View>(null);
  const laidOut = useRef<(() => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const share = async () => {
    if (!game || busy) return;
    setBusy(true);
    setNotice(null);
    const info = { fileName: scoreCardFileName(game), title: `${game.courseName} score card`, text: scoreCardText(game) };
    try {
      await new Promise<void>((resolve) => {
        laidOut.current = resolve;
        setTimeout(resolve, 1500);
      });
      await nextFrame();
      await nextFrame();
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      });
      const outcome = await shareImage(uri, info);
      if (outcome === 'downloaded') setNotice('Score card image saved to your downloads.');
    } catch (error) {
      console.warn('[share score card]', error);
      if (!(await shareText(info))) setNotice("Couldn't share the score card on this device.");
    } finally {
      laidOut.current = null;
      setBusy(false);
    }
  };

  const capture =
    busy && game ? (
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.holder}
      >
        <View ref={cardRef} collapsable={false} onLayout={() => laidOut.current?.()} testID="score-card-capture">
          <ScoreCardImage game={game} />
        </View>
      </View>
    ) : null;

  return { share, busy, notice, capture };
}

/** Big, obvious share action (score sheet and round celebration). */
export function ShareScoreCardButton({
  onPress,
  busy,
  notice,
  tone = 'dark',
}: {
  onPress: () => void;
  busy: boolean;
  notice?: string | null;
  tone?: 'dark' | 'light';
}) {
  const light = tone === 'light';
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share score card"
        aria-busy={busy}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [styles.button, light && styles.buttonLight, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.icon}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <Icon name="share" size={20} strokeWidth={2.2} color={colors.ink} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, light && { color: colors.ink }]}>{busy ? 'Preparing score card…' : 'Share score card'}</Text>
          <Text style={[styles.subtitle, light && { color: '#6f7f77' }]}>Send everyone the scores as an image</Text>
        </View>
        <Icon name="chevron" size={18} color={light ? '#9ca7a1' : 'rgba(255,255,255,0.6)'} />
      </Pressable>
      {notice ? <Text style={[styles.notice, light && { color: 'rgba(255,255,255,0.8)' }]}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { position: 'absolute', top: 0, left: 0, width: SCORE_CARD_WIDTH },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.deep,
    boxShadow: '0 10px 22px rgba(6, 50, 54, 0.22)',
  },
  buttonLight: { backgroundColor: '#fff', boxShadow: '0 10px 22px rgba(0, 0, 0, 0.18)' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.yellow },
  title: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 21 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: fonts.body },
  notice: { marginTop: 7, color: colors.green, fontSize: 10, fontFamily: fonts.bodySemi, textAlign: 'center' },
});
