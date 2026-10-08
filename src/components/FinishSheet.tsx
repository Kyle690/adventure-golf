import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import type { Player } from '@/db/schema';
import { winnerHeadline, type PlayerResult } from '@/lib/results';
import { formatVsPar } from '@/lib/stats';
import { colors, fonts } from '@/theme';

/**
 * "Finish round" confirmation: final standings with the winner highlighted. Nothing is written
 * until "Confirm result" (then the game is marked completed).
 */
export function FinishSheet({
  visible,
  courseName,
  results,
  players,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  courseName: string;
  results: PlayerResult[];
  /** Players in turn order (for avatar colours/photos). */
  players: Player[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const missing = results.filter((r) => r.missing > 0);
  const nothingScored = results.every((r) => r.holesScored === 0);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onCancel}>
        <Pressable
          accessibilityViewIsModal
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]}
        >
          <View style={styles.handle} />
          <ScrollView bounces={false} style={{ maxHeight: 560 }}>
            <View style={styles.trophy}>
              <Icon name="trophy" size={28} color="#c99a12" />
            </View>
            <Eyebrow style={{ marginTop: 13, marginBottom: 6, color: colors.green, textAlign: 'center' }}>
              {`FINAL RESULT · ${courseName.toUpperCase()}`}
            </Eyebrow>
            <Text style={styles.title}>{winnerHeadline(results)}</Text>
            <Text style={styles.copy}>Check the totals below. Once confirmed, the round is saved as finished.</Text>

            <View style={styles.list}>
              {results.map((r) => {
                const index = players.findIndex((p) => p.id === r.playerId);
                const player = players[index];
                return (
                  <View key={r.playerId} style={[styles.row, r.isWinner && styles.rowWinner]}>
                    <Text style={styles.rank}>{r.rank ?? '–'}</Text>
                    {player ? <PlayerAvatar player={player} index={index} size={32} /> : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.sub}>
                        {r.holesScored ? `${formatVsPar(r.vsPar)} vs par` : 'No scores'}
                        {r.missing && r.holesScored ? ` · ${r.missing} hole${r.missing === 1 ? '' : 's'} not scored` : ''}
                      </Text>
                    </View>
                    {r.isWinner ? <Icon name="trophy" size={18} color="#c99a12" /> : null}
                    <Text style={styles.total}>{r.holesScored ? r.total : '–'}</Text>
                  </View>
                );
              })}
            </View>

            {missing.length > 0 && !nothingScored ? (
              <Text style={styles.warning}>
                Some holes have no score. Totals only count the holes that were scored.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={nothingScored}
              style={[styles.button, styles.confirm, nothingScored && { opacity: 0.45 }]}
              onPress={onConfirm}
            >
              <Icon name="check" size={17} strokeWidth={2.6} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm result</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.button, { marginTop: 10 }]} onPress={onCancel}>
              <Text style={styles.buttonText}>Keep editing scores</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Same bottom-sheet treatment as the round menu.
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(2, 30, 32, 0.62)',
  },
  sheet: {
    width: '100%',
    maxWidth: 442,
    paddingTop: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: colors.cream,
    boxShadow: '0 -12px 40px rgba(3, 35, 38, 0.28)',
  },
  handle: {
    alignSelf: 'center',
    width: 35,
    height: 4,
    marginBottom: 17,
    borderRadius: 4,
    backgroundColor: '#c7cec5',
  },
  trophy: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#fff3c8',
  },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 25, textAlign: 'center' },
  copy: {
    alignSelf: 'center',
    maxWidth: 300,
    marginTop: 5,
    color: '#7c8c84',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  list: { gap: 7, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#dce3d9',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  rowWinner: { borderColor: '#f1ba28', backgroundColor: '#fffbea' },
  rank: { width: 14, textAlign: 'center', color: '#8a9790', fontSize: 11, fontFamily: fonts.bodyBold },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  sub: { color: '#849189', fontSize: 9, fontFamily: fonts.body },
  total: { minWidth: 30, textAlign: 'right', color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20 },
  warning: { marginTop: 10, textAlign: 'center', color: '#b9142e', fontSize: 10, fontFamily: fonts.bodySemi },
  button: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    padding: 13,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#e6ebe3',
  },
  confirm: { marginTop: 16, backgroundColor: colors.red },
  buttonText: { color: colors.ink, fontSize: 11, fontFamily: fonts.bodyBold },
});
