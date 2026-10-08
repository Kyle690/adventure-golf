import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddPlayerForm } from '@/components/AddPlayerForm';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { getCourse, listPlayers, startGame } from '@/db/queries';
import { useRoundDraft } from '@/state/round-draft';
import { colors, fonts, MAX_PLAYERS } from '@/theme';

/**
 * Game flow step 2: pick who's playing (tap to toggle, add new players; no deleting here) and
 * start the round on the course passed as ?courseId= (from game/new or a venue's "Play").
 */
export default function PickPlayersScreen() {
  const insets = useSafeAreaInsets();
  const draft = useRoundDraft();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const { data } = useDbQuery(async () => {
    const [players, course] = await Promise.all([listPlayers(), courseId ? getCourse(Number(courseId)) : undefined]);
    return { players, course: course ?? null };
  }, courseId ?? '');

  const players = data?.players ?? [];
  // Untouched selection = everyone (the prototype starts with all saved players selected).
  const selected = (draft.selectedPlayerIds ?? players.map((p) => p.id)).filter((id) =>
    players.some((p) => p.id === id),
  );

  const course = data?.course ?? null;

  const loadedPlayers = data?.players;
  useEffect(() => {
    if (draft.selectedPlayerIds === null && loadedPlayers?.length) {
      draft.setSelectedPlayerIds(loadedPlayers.map((p) => p.id));
    }
  }, [draft, loadedPlayers]);

  const toggle = (id: number) => {
    draft.setSelectedPlayerIds(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top), height: 234 + Math.max(0, insets.top - 16) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ marginBottom: 6, color: '#8dcc58' }}>YOUR CREW</Eyebrow>
          <Text style={styles.title}>Who&apos;s playing?</Text>
          <Text style={styles.subtitle}>
            {course ? `${course.name} · ${course.venue.name} · ${course.holes.length} holes` : `Select up to ${MAX_PLAYERS} players.`}
          </Text>
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
                  accessibilityLabel={player.name}
                  aria-checked={isSelected}
                  key={player.id}
                  onPress={() => toggle(player.id)}
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  <PlayerAvatar player={player} index={index} />
                  <View style={styles.name}>
                    <Text style={styles.nameText}>{player.name}</Text>
                    <Text style={styles.role}>{player.isOwner ? 'Scorekeeper' : 'Player'}</Text>
                  </View>
                  <View style={[styles.check, isSelected && styles.checkSelected]}>
                    {isSelected ? <Icon name="check" size={15} strokeWidth={2.8} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <AddPlayerForm players={players} onAdded={(player) => draft.setSelectedPlayerIds([...selected, player.id])} />

          {data && !course ? (
            <View style={styles.noCourse}>
              <Text style={styles.noCourseText}>Pick a venue and course first.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/game/new')}>
                <Text style={styles.noCourseLink}>Choose a course</Text>
              </Pressable>
            </View>
          ) : null}

          <WideCta label="Start the round" disabled={selected.length === 0 || !course} onPress={start} />
        </View>
      </ScrollView>
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
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21 },
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
  noCourse: { alignItems: 'center', gap: 4, marginTop: 14 },
  noCourseText: { color: '#82908a', fontSize: 11, fontFamily: fonts.body },
  noCourseLink: { color: colors.green, fontSize: 12, fontFamily: fonts.bodyBold },
});
