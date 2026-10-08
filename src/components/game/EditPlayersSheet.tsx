import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddPlayerForm } from '@/components/AddPlayerForm';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { useDbQuery } from '@/db/hooks';
import { addPlayerToGame, type GameDetail, listPlayers, removePlayerFromGame } from '@/db/queries';
import type { Player } from '@/db/schema';
import { colors, fonts, MAX_PLAYERS } from '@/theme';

/**
 * "Edit players" bottom sheet for a live round: remove players (confirming first if they have
 * scores, which are then deleted for this round), add saved players, or create a new one inline.
 * New players join at the end of the turn order; at least one player always stays.
 */
export function EditPlayersSheet({ game, visible, onClose }: { game: GameDetail; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: saved } = useDbQuery(listPlayers);
  const [confirming, setConfirming] = useState<{ player: Player; scores: number } | null>(null);

  const inGame = game.gamePlayers.map((gp) => gp.player);
  const inGameIds = new Set(inGame.map((p) => p.id));
  const others = (saved ?? []).filter((p) => !inGameIds.has(p.id));
  const full = inGame.length >= MAX_PLAYERS;
  const lastOne = inGame.length <= 1;
  const scoreCount = (playerId: number) => game.scores.filter((s) => s.playerId === playerId).length;
  // Saved-player index keeps avatar fallback colours the same as in the crew list.
  const savedIndex = (player: Player) => Math.max(0, (saved ?? []).findIndex((p) => p.id === player.id));

  const close = () => {
    setConfirming(null);
    onClose();
  };
  const remove = (player: Player) => {
    if (lastOne) return;
    const scores = scoreCount(player.id);
    if (scores > 0) setConfirming({ player, scores });
    else removePlayerFromGame(game.id, player.id);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close edit players" style={styles.backdrop} onPress={close}>
          <Pressable
            accessibilityViewIsModal
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]}
          >
            <View style={styles.handle} />
            {confirming ? (
              <View>
                <View style={styles.dangerIcon}>
                  <Icon name="trash" size={26} color={colors.red} />
                </View>
                <Eyebrow style={{ marginTop: 13, marginBottom: 6, color: colors.red, textAlign: 'center' }}>ARE YOU SURE?</Eyebrow>
                <Text style={styles.title}>Remove {confirming.player.name}?</Text>
                <Text style={[styles.copy, styles.confirmCopy]}>
                  {confirming.player.name}&apos;s {confirming.scores} {confirming.scores === 1 ? 'score' : 'scores'} in this round
                  will be deleted. They stay in your crew, and their other rounds aren&apos;t affected.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.button, styles.buttonDanger]}
                  onPress={() => {
                    removePlayerFromGame(game.id, confirming.player.id);
                    setConfirming(null);
                  }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Yes, remove {confirming.player.name}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={[styles.button, { marginTop: 10 }]} onPress={() => setConfirming(null)}>
                  <Text style={styles.buttonText}>No, keep {confirming.player.name}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 4 }}>
                <View style={styles.heading}>
                  <Eyebrow style={{ marginBottom: 6, color: colors.green }}>LIVE ROUND</Eyebrow>
                  <Text style={styles.title}>Edit players</Text>
                  <Text style={styles.copy}>Changes only apply to this round. Everyone else&apos;s scores are kept.</Text>
                </View>

                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionLabel}>IN THIS ROUND</Text>
                  <Text style={styles.sectionLabel}>
                    {inGame.length} / {MAX_PLAYERS}
                  </Text>
                </View>
                <View style={styles.list}>
                  {inGame.map((player, index) => {
                    const scores = scoreCount(player.id);
                    return (
                      <View key={player.id} style={styles.row}>
                        <PlayerAvatar player={player} index={index} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{player.name}</Text>
                          <Text style={styles.sub}>
                            {scores ? `${scores} of ${game.holes.length} holes scored` : 'No scores yet'}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${player.name} from round`}
                          aria-disabled={lastOne}
                          disabled={lastOne}
                          onPress={() => remove(player)}
                          style={[styles.iconButton, styles.removeButton, lastOne && { opacity: 0.35 }]}
                        >
                          <Icon name="close" size={17} strokeWidth={2.2} color={colors.red} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                {lastOne ? <Text style={styles.hint}>A round needs at least one player.</Text> : null}

                {others.length ? (
                  <>
                    <View style={styles.sectionHeading}>
                      <Text style={styles.sectionLabel}>ADD FROM YOUR CREW</Text>
                    </View>
                    <View style={styles.list}>
                      {others.map((player) => (
                        <Pressable
                          key={player.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${player.name} to round`}
                          aria-disabled={full}
                          disabled={full}
                          onPress={() => addPlayerToGame(game.id, player.id)}
                          style={[styles.row, styles.rowAdd, full && { opacity: 0.45 }]}
                        >
                          <PlayerAvatar player={player} index={savedIndex(player)} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{player.name}</Text>
                            <Text style={styles.sub}>Tap to add them to this round</Text>
                          </View>
                          <View style={[styles.iconButton, styles.addButton]}>
                            <Icon name="plus" size={17} strokeWidth={2.2} color="#fff" />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {full ? (
                  <Text style={styles.hint}>A round has room for {MAX_PLAYERS} players.</Text>
                ) : (
                  <AddPlayerForm players={saved ?? []} onAdded={(player) => addPlayerToGame(game.id, player.id)} />
                )}

                <Pressable accessibilityRole="button" style={[styles.button, styles.done]} onPress={close}>
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Done</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: colors.cream,
    boxShadow: '0 -12px 40px rgba(3, 35, 38, 0.28)',
  },
  handle: { alignSelf: 'center', width: 35, height: 4, marginBottom: 17, borderRadius: 4, backgroundColor: '#c7cec5' },
  heading: { marginBottom: 6, alignItems: 'center' },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, textAlign: 'center' },
  copy: { marginTop: 5, color: '#7c8c84', fontSize: 11, lineHeight: 16, textAlign: 'center', fontFamily: fonts.body },
  confirmCopy: { alignSelf: 'center', maxWidth: 320, marginTop: 8, marginBottom: 19 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionLabel: { color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.72 },
  list: { gap: 7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  rowAdd: { borderStyle: 'dashed', borderColor: '#b9c7b8', backgroundColor: '#fbfcf9' },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  sub: { marginTop: 1, color: '#849189', fontSize: 9, fontFamily: fonts.body },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  removeButton: { backgroundColor: '#ffe8ea' },
  addButton: { backgroundColor: colors.green },
  hint: { marginTop: 8, color: '#82908a', fontSize: 10, fontFamily: fonts.bodySemi, textAlign: 'center' },
  dangerIcon: {
    alignSelf: 'center',
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#ffe3e6',
  },
  button: { padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: '#e6ebe3' },
  buttonDanger: { backgroundColor: colors.red },
  done: { marginTop: 16, backgroundColor: colors.green },
  buttonText: { color: colors.ink, fontSize: 12, fontFamily: fonts.bodyBold },
});
