import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import type { GameDetail } from '@/db/queries';
import { currentHoleIndex, gameResults } from '@/lib/game';
import { winnerHeadline, withVerb } from '@/lib/results';
import { formatVsPar } from '@/lib/stats';
import { formatDayTime } from '@/lib/time';
import { colors, fonts } from '@/theme';

/**
 * A played game. Live rounds get a red LIVE badge and open the score entry screen to continue;
 * finished rounds show the winner and open the read-only score sheet.
 */
export function GameCard({ game }: { game: GameDetail }) {
  const live = game.status === 'in_progress';
  const results = gameResults(game);
  const leader = results[0];
  const players = game.gamePlayers.map((gp) => gp.player);
  const holeCount = game.holes.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.courseName}, ${live ? 'live round, continue' : 'finished round, open result'}`}
      onPress={() => router.push(live ? `/game/${game.id}` : `/game/${game.id}/complete`)}
      style={({ pressed }) => [styles.card, live && styles.cardLive, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.top}>
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE · HOLE {currentHoleIndex(game) + 1} OF {holeCount}</Text>
          </View>
        ) : (
          <Eyebrow style={{ fontSize: 8, color: '#8a9790' }}>FINISHED</Eyebrow>
        )}
        <Text style={styles.date}>{formatDayTime(game.completedAt ?? game.startedAt)}</Text>
      </View>
      <View style={styles.body}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.course} numberOfLines={1}>
            {game.courseName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {live
              ? leader?.holesScored
                ? `${withVerb(leader.name, 'lead')} on ${leader.total}`
                : 'No scores yet'
              : `${winnerHeadline(results).replace('!', '')}${leader?.holesScored ? ` · ${leader.total} (${formatVsPar(leader.vsPar)})` : ''}`}
          </Text>
          <View style={styles.avatars}>
            {players.map((p, i) => (
              <View key={p.id} style={styles.avatarWrap}>
                <PlayerAvatar player={p} index={i} size={24} />
              </View>
            ))}
            <Text style={styles.count}>{players.length} {players.length === 1 ? 'player' : 'players'}</Text>
          </View>
        </View>
        <View style={[styles.action, live ? styles.actionLive : styles.actionDone]}>
          <Text style={[styles.actionText, !live && { color: colors.ink }]}>{live ? 'Continue' : 'Scorecard'}</Text>
          <Icon name={live ? 'arrow' : 'chevron'} size={15} color={live ? '#fff' : colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 13, borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 15, backgroundColor: '#fff' },
  cardLive: { borderColor: '#f3b8c1', backgroundColor: '#fffafa' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#ffe9e4',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.red,
    boxShadow: '0 0 0 3px rgba(237, 27, 59, 0.15)',
  },
  liveText: { color: colors.red, fontSize: 8, lineHeight: 11, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  date: { color: '#919c96', fontSize: 8, fontFamily: fonts.bodySemi },
  body: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  course: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20 },
  sub: { color: '#5f6f67', fontSize: 10, fontFamily: fonts.body },
  avatars: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  avatarWrap: { marginRight: -5, borderWidth: 2, borderColor: '#fff', borderRadius: 14 },
  count: { marginLeft: 11, color: '#8c9992', fontSize: 9, fontFamily: fonts.body },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  actionLive: { backgroundColor: colors.red },
  actionDone: { backgroundColor: '#eff2ed' },
  actionText: { color: '#fff', fontSize: 10, fontFamily: fonts.bodyBold },
});
