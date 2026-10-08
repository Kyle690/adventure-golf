import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_CLEARANCE } from '@/components/BottomNav';
import { AddPlayerForm } from '@/components/AddPlayerForm';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { useDbQuery } from '@/db/hooks';
import { listGamesForStats, listPlayers } from '@/db/queries';
import type { Player } from '@/db/schema';
import { formatHandicap } from '@/lib/handicap';
import { formatVsPar, playerStats, type PlayerStats } from '@/lib/stats';
import { colors, fonts } from '@/theme';

type SortKey = 'name' | 'handicap' | 'games' | 'best';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'handicap', label: 'Handicap' },
  { key: 'games', label: 'Games' },
  { key: 'best', label: 'Best' },
];

type Entry = { player: Player; index: number; stats: PlayerStats };

/** Nulls always sort last; ties fall back to name. */
function compare(a: Entry, b: Entry, key: SortKey) {
  const byName = a.player.name.localeCompare(b.player.name);
  const nullsLast = (x: number | null, y: number | null, dir: 1 | -1) => {
    if (x == null && y == null) return byName;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir || byName;
  };
  switch (key) {
    case 'handicap':
      return nullsLast(a.stats.handicap, b.stats.handicap, 1); // lowest handicap first
    case 'games':
      return b.stats.rounds - a.stats.rounds || byName; // most games first
    case 'best':
      return nullsLast(a.stats.best?.total ?? null, b.stats.best?.total ?? null, 1); // lowest score first
    default:
      return byName;
  }
}

/** Players tab: everyone the owner has recorded, with games, calculated handicap and best score. */
export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortKey>('name');
  const { data } = useDbQuery(async () => {
    const [players, games] = await Promise.all([listPlayers(), listGamesForStats()]);
    return players.map((player, index) => ({ player, index, stats: playerStats(player.id, games, 0) }));
  });

  const entries = data ?? [];
  const owner = entries.find((e) => e.player.isOwner);
  // The owner ("You") is always pinned first; the sort applies to everyone else.
  const others = entries.filter((e) => !e.player.isOwner).sort((a, b) => compare(a, b, sort));
  const list = owner ? [owner, ...others] : others;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(105,183,52,0.06)', 'transparent']}
        locations={[0, 0.35]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <Logo compact style={{ marginBottom: 21 }} />
          <Eyebrow style={{ marginBottom: 6, color: '#8dcc58' }}>CLUBHOUSE</Eyebrow>
          <Text style={styles.title}>Your crew</Text>
          <Text style={styles.subtitle}>Everyone you play with. Handicaps are calculated from finished rounds.</Text>
        </View>

        <View style={styles.content}>
          {data ? (
            <>
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>SORT BY</Text>
                <View style={styles.chips}>
                  {SORTS.map((s) => {
                    const selected = s.key === sort;
                    return (
                      <Pressable
                        key={s.key}
                        accessibilityRole="radio"
                        aria-selected={selected}
                        accessibilityLabel={`Sort by ${s.label}`}
                        onPress={() => setSort(s.key)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {list.map((entry) => (
                  <PlayerCard key={entry.player.id} entry={entry} />
                ))}
              </View>

              {others.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Icon name="users" />
                  </View>
                  <Text style={styles.emptyTitle}>It&apos;s just you so far</Text>
                  <Text style={styles.emptyCopy}>
                    Add friends and family to your crew below. Their games, handicap and best score will show up here.
                  </Text>
                </View>
              ) : null}
              <AddPlayerForm players={entries.map((e) => e.player)} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function PlayerCard({ entry }: { entry: Entry }) {
  const { player, index, stats } = entry;
  const best = stats.best;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.isOwner ? 'You' : player.name}, open player details`}
      onPress={() => router.push(`/players/${player.id}`)}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.cardTop}>
        <PlayerAvatar player={player} index={index} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {player.isOwner ? 'You' : player.name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {player.isOwner ? `Scorekeeper · ${player.name}` : 'Player'}
          </Text>
        </View>
        <Icon name="chevron" size={18} color="#9ca7a1" />
      </View>
      <View style={styles.tiles}>
        <Tile label="GAMES" value={String(stats.rounds)} sub={stats.rounds === 1 ? 'Finished round' : 'Finished rounds'} />
        <Tile
          label="HANDICAP"
          value={formatHandicap(stats.handicap)}
          sub={
            stats.handicap != null
              ? `Calculated · ${stats.handicapRounds} rd${stats.handicapRounds === 1 ? '' : 's'}`
              : player.handicap != null
                ? `Starting ${player.handicap}`
                : 'No rounds yet'
          }
          accent
        />
        <Tile
          label="BEST"
          value={best ? String(best.total) : '–'}
          sub={best ? `${formatVsPar(best.vsPar)} · ${best.courseName}` : 'No rounds yet'}
        />
      </View>
    </Pressable>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      <Text style={[styles.tileLabel, accent && { color: '#b7e783' }]}>{label}</Text>
      <Text style={[styles.tileValue, accent && { color: '#fff' }]}>{value}</Text>
      <Text style={[styles.tileSub, accent && { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  // Same header as the Players (Who's playing?) screen.
  header: { paddingHorizontal: 22, paddingBottom: 23, overflow: 'hidden', backgroundColor: colors.deep },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subtitle: { marginTop: 5, maxWidth: 300, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sortLabel: { color: '#7b8c83', fontSize: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.72 },
  chips: { flex: 1, flexDirection: 'row', gap: 5 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: colors.green, backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodySemi },
  chipTextSelected: { color: '#fff' },
  // Player-row surface from the prototype.
  card: {
    padding: 13,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15 },
  role: { marginTop: 1, color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  tiles: { flexDirection: 'row', gap: 7, marginTop: 12 },
  tile: { flex: 1, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#edf4e8' },
  tileAccent: { backgroundColor: colors.green },
  tileLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  tileValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24 },
  tileSub: { color: '#7f8e86', fontSize: 8, lineHeight: 12, fontFamily: fonts.body },
  empty: {
    alignItems: 'center',
    marginTop: 14,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.yellow,
  },
  emptyTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  emptyCopy: { marginTop: 3, maxWidth: 270, textAlign: 'center', color: '#82908a', fontSize: 10, fontFamily: fonts.body },
});
