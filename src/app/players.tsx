import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, NAV_CLEARANCE } from '@/components/BottomNav';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { addPlayer, listPlayers, listVenues, removePlayer, startGame } from '@/db/queries';
import type { Player } from '@/db/schema';
import { nextPlayerColor } from '@/lib/players';
import { useRoundDraft } from '@/state/round-draft';
import { colors, fonts, MAX_PLAYERS } from '@/theme';

export default function PlayersScreen() {
  const insets = useSafeAreaInsets();
  const draft = useRoundDraft();
  const [newName, setNewName] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<Player | null>(null);
  const { data } = useDbQuery(async () => {
    const [players, venues] = await Promise.all([listPlayers(), listVenues()]);
    return { players, venues };
  });

  const players = data?.players ?? [];
  // Untouched selection = everyone (the prototype starts with all saved players selected).
  const selected = (draft.selectedPlayerIds ?? players.map((p) => p.id)).filter((id) =>
    players.some((p) => p.id === id),
  );

  // Resolve the course chosen on the setup screen (or the first course if the user came straight here).
  const allCourses = data?.venues.flatMap((v) => v.courses) ?? [];
  const course = allCourses.find((c) => c.id === draft.courseId) ?? allCourses[0];

  const loadedPlayers = data?.players;
  useEffect(() => {
    if (draft.selectedPlayerIds === null && loadedPlayers?.length) {
      draft.setSelectedPlayerIds(loadedPlayers.map((p) => p.id));
    }
  }, [draft, loadedPlayers]);

  const toggle = (id: number) => {
    draft.setSelectedPlayerIds(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const add = () => {
    const name = newName.trim();
    if (!name || players.length >= MAX_PLAYERS) return;
    const player = addPlayer(name, nextPlayerColor(players));
    draft.setSelectedPlayerIds([...selected, player.id]);
    setNewName('');
  };

  const remove = (id: number) => {
    setPendingRemoval(null);
    removePlayer(id);
    draft.setSelectedPlayerIds(selected.filter((x) => x !== id));
  };

  const start = () => {
    if (!course || selected.length === 0) return;
    // Turn order follows the crew list order, like the prototype's players.filter(selected).
    const ordered = players.filter((p) => selected.includes(p.id)).map((p) => p.id);
    const game = startGame(course.id, ordered);
    router.replace(`/game/${game.id}`);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(105,183,52,0.06)', 'transparent']}
        locations={[0, 0.35]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom }}
      >
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top), height: 234 + Math.max(0, insets.top - 16) }]}>
          <LeafDecoration />
          <Logo compact style={{ marginBottom: 21 }} />
          <Eyebrow style={{ marginBottom: 6, color: '#8dcc58' }}>YOUR CREW</Eyebrow>
          <Text style={styles.title}>Who&apos;s playing?</Text>
          <Text style={styles.subtitle}>Select up to {MAX_PLAYERS} players for this round.</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.count}>
            <Text style={styles.countText}>{selected.length} SELECTED</Text>
            <Text style={styles.countText}>
              {players.length} / {MAX_PLAYERS} SAVED
            </Text>
          </View>

          <View style={styles.list}>
            {players.map((player, index) => {
              const isSelected = selected.includes(player.id);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  key={player.id}
                  onPress={() => toggle(player.id)}
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  <PlayerAvatar player={player} index={index} />
                  <View style={styles.name}>
                    <Text style={styles.nameText}>{player.name}</Text>
                    <Text style={styles.role}>{player.isOwner ? 'Scorekeeper' : 'Player'}</Text>
                  </View>
                  {!player.isOwner ? (
                    <Pressable
                      accessibilityLabel={`Remove ${player.name}`}
                      hitSlop={6}
                      onPress={() => setPendingRemoval(player)}
                      style={styles.remove}
                    >
                      <Icon name="trash" size={17} color="#a6aea9" />
                    </Pressable>
                  ) : null}
                  <View style={[styles.check, isSelected && styles.checkSelected]}>
                    {isSelected ? <Icon name="check" size={15} strokeWidth={2.8} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {players.length < MAX_PLAYERS ? (
            <View style={styles.addForm}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addLabel}>ADD A PLAYER</Text>
                <TextInput
                  accessibilityLabel="Player name"
                  value={newName}
                  onChangeText={setNewName}
                  onSubmitEditing={add}
                  placeholder="Enter their name"
                  placeholderTextColor="#9aa59f"
                  returnKeyType="done"
                  style={styles.input}
                />
              </View>
              <Pressable accessibilityLabel="Add player" onPress={add} style={styles.addButton}>
                <Icon name="plus" color="#fff" />
              </Pressable>
            </View>
          ) : null}

          <WideCta label="Start the round" disabled={selected.length === 0 || !course} onPress={start} />
        </View>
      </ScrollView>
      {/* New game is a flow started from Home, not a tab: no tab is highlighted. */}
      <BottomNav />
      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={`Remove ${pendingRemoval?.name ?? 'player'}?`}
        message={`${pendingRemoval?.name ?? 'This player'} and all of their scores will be removed, including past rounds. This action can't be undone.`}
        confirmLabel="Yes, remove player"
        cancelLabel="No, keep them"
        onConfirm={() => pendingRemoval && remove(pendingRemoval.id)}
        onCancel={() => setPendingRemoval(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 22, paddingBottom: 23, overflow: 'hidden', backgroundColor: colors.deep },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subtitle: { marginTop: 5, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 19, paddingHorizontal: 20, paddingBottom: 28 },
  count: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  countText: { color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.72 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  rowSelected: { borderColor: '#77b763', backgroundColor: '#fbfdf9' },
  name: { flex: 1 },
  nameText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  role: { marginTop: 2, color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  remove: { padding: 7 },
  check: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cad2cc',
    borderRadius: 12,
  },
  checkSelected: { borderColor: colors.green, backgroundColor: colors.green },
  addForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    marginTop: 13,
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  addLabel: { marginBottom: 5, color: '#75837b', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  input: {
    paddingVertical: 7,
    paddingHorizontal: 0,
    color: colors.ink,
    fontSize: 12,
    fontFamily: fonts.body,
    borderBottomWidth: 1,
    borderBottomColor: '#c8d1c6',
    outlineStyle: 'none',
  } as object,
  addButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.green,
  },
});
