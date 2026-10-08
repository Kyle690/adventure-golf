import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_CLEARANCE } from '@/components/BottomNav';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { useDbQuery } from '@/db/hooks';
import { type GameDetail, getOwner, listCompletedGames } from '@/db/queries';
import { gameResults } from '@/lib/game';
import { winnerHeadline } from '@/lib/results';
import { formatVsPar } from '@/lib/stats';
import { formatDayTime } from '@/lib/time';
import { colors, fonts } from '@/theme';

/**
 * History tab: every finished game, newest first, with the names it was played under (snapshot),
 * players, winner and the owner's total vs par. Tapping opens the game complete screen (review).
 */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useDbQuery(async () => {
    const [games, owner] = await Promise.all([listCompletedGames(), getOwner()]);
    return { games, ownerId: owner?.id ?? null };
  });
  const games = data?.games ?? [];
  const ownerRounds = games
    .map((g) => gameResults(g).find((r) => r.playerId === data?.ownerId))
    .filter((r) => r && r.holesScored > 0);
  const wins = ownerRounds.filter((r) => r?.isWinner).length;

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
          <Text style={styles.title}>Game history</Text>
          <Text style={styles.subtitle}>Every finished round, newest first.</Text>
        </View>

        <View style={styles.content}>
          {data && games.length > 0 ? (
            <>
              <View style={styles.summary}>
                <Summary label="ROUNDS" value={String(games.length)} />
                <Summary label="YOU PLAYED" value={String(ownerRounds.length)} />
                <Summary label="YOUR WINS" value={String(wins)} accent />
              </View>
              <View style={{ gap: 10 }}>
                {games.map((game) => (
                  <HistoryCard key={game.id} game={game} ownerId={data.ownerId} />
                ))}
              </View>
            </>
          ) : null}

          {data && games.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="history" color="#fff" />
              </View>
              <Text style={styles.emptyTitle}>No finished rounds yet</Text>
              <Text style={styles.emptyCopy}>Finish and confirm a round and it shows up here with the winner and scores.</Text>
              <Pressable accessibilityRole="button" style={styles.emptyButton} onPress={() => router.push('/game/new')}>
                <Icon name="plus" size={17} color="#fff" />
                <Text style={styles.emptyButtonText}>Start a new game</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.summaryTile, accent && styles.summaryAccent]}>
      <Text style={[styles.summaryLabel, accent && { color: '#b7e783' }]}>{label}</Text>
      <Text style={[styles.summaryValue, accent && { color: '#fff' }]}>{value}</Text>
    </View>
  );
}

function HistoryCard({ game, ownerId }: { game: GameDetail; ownerId: number | null }) {
  const results = gameResults(game);
  const winners = results.filter((r) => r.isWinner);
  const mine = results.find((r) => r.playerId === ownerId);
  const players = game.gamePlayers.map((gp) => gp.player);
  const winnerLine = winners.length
    ? `${winnerHeadline(results).replace('!', '')} · ${winners[0].total} (${formatVsPar(winners[0].vsPar)})`
    : 'No scores';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.courseName} at ${game.venueName}, open result`}
      onPress={() => router.push(`/game/${game.id}/complete`)}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.date}>{formatDayTime(game.completedAt ?? game.startedAt).toUpperCase()}</Text>
        <Text style={styles.course} numberOfLines={1}>
          {game.courseName}
        </Text>
        <View style={styles.venueRow}>
          <Icon name="pin" size={13} color="#8c9992" />
          <Text style={styles.venue} numberOfLines={1}>
            {game.venueName} · {game.holes.length} holes
          </Text>
        </View>
        <View style={styles.winnerRow}>
          <Icon name="trophy" size={13} color="#c99a12" />
          <Text style={styles.winner} numberOfLines={1}>
            {winnerLine}
          </Text>
        </View>
        <View style={styles.avatars}>
          {players.map((p, i) => (
            <View key={p.id} style={styles.avatarWrap}>
              <PlayerAvatar player={p} index={i} size={22} />
            </View>
          ))}
          <Text style={styles.count}>
            {players.length} {players.length === 1 ? 'player' : 'players'}
          </Text>
        </View>
      </View>
      <View style={[styles.mine, mine?.isWinner && styles.mineWinner]}>
        <Text style={styles.mineLabel}>YOU</Text>
        <Text style={styles.mineTotal}>{mine?.holesScored ? mine.total : '–'}</Text>
        <Text style={styles.mineVs}>{mine?.holesScored ? formatVsPar(mine.vsPar) : mine ? 'No scores' : 'Didn’t play'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 22, paddingBottom: 23, overflow: 'hidden', backgroundColor: colors.deep },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subtitle: { marginTop: 5, maxWidth: 300, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryTile: { flex: 1, padding: 11, borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 14, backgroundColor: '#fff' },
  summaryAccent: { borderColor: colors.green, backgroundColor: colors.green },
  summaryLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  summaryValue: { marginTop: 3, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  date: { color: colors.green, fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.1 },
  course: { marginTop: 2, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  venue: { flex: 1, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  winner: { flex: 1, color: '#5f6f67', fontSize: 10, fontFamily: fonts.bodySemi },
  avatars: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarWrap: { marginRight: -5, borderWidth: 2, borderColor: '#fff', borderRadius: 13 },
  count: { marginLeft: 11, color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  mine: {
    width: 74,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#edf4e8',
  },
  mineWinner: { backgroundColor: '#fff3c8' },
  mineLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  mineTotal: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30 },
  mineVs: { color: colors.green, fontSize: 10, fontFamily: fonts.bodyBold },
  empty: {
    alignItems: 'center',
    padding: 22,
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
    backgroundColor: colors.green,
  },
  emptyTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  emptyCopy: { marginTop: 3, maxWidth: 270, textAlign: 'center', color: '#82908a', fontSize: 10, fontFamily: fonts.body },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: colors.red,
  },
  emptyButtonText: { color: '#fff', fontSize: 11, fontFamily: fonts.bodyBold },
});
