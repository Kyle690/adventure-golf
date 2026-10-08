import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, NAV_CLEARANCE } from '@/components/BottomNav';
import { Eyebrow } from '@/components/Eyebrow';
import { GolfBall } from '@/components/GolfBall';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { useDbQuery } from '@/db/hooks';
import {
  countVenues,
  getLastCompletedGame,
  getLiveGame,
  listPlayers,
  needsOnboarding,
  type GameDetail,
} from '@/db/queries';
import { bestTotal, currentHoleIndex } from '@/lib/game';
import { initials, playerColor } from '@/lib/players';
import { formatDayTime } from '@/lib/time';
import { BRAND, colors, fonts } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useDbQuery(async () => {
    const [onboarding, liveGame, lastGame, venueCount, players] = await Promise.all([
      needsOnboarding(),
      getLiveGame(),
      getLastCompletedGame(),
      countVenues(),
      listPlayers(),
    ]);
    return { onboarding, liveGame, lastGame, venueCount, players };
  });

  const topPad = Math.max(22, insets.top);
  const owner = data?.players.find((p) => p.isOwner);

  // First run (no owner yet, or onboarding left half-way): go through onboarding before Home.
  if (!data) return <View style={styles.screen} />;
  if (data.onboarding) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom }}>
        <View style={[styles.hero, { paddingTop: topPad, height: 322 + topPad - 22 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.04)', 'transparent']}
            locations={[0, 0.4]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LeafDecoration />
          <View style={styles.heroTop}>
            <Logo />
            {/* Prototype hard-codes "MS"; we use the owner's initials. Opens the Players tab (crew). */}
            <Pressable
              accessibilityLabel="Open profile"
              onPress={() => router.dismissTo('/crew')}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials(owner?.name) || '?'}</Text>
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>WELCOME BACK</Text>
            <Text style={styles.heroTitle}>{'Ready for an\nadventure?'}</Text>
          </View>
          <GolfBall size={62} style={{ right: 28, bottom: 24, transform: [{ rotate: '18deg' }] }} />
          <GolfBall size={24} style={{ right: 105, bottom: 97, opacity: 0.7 }} />
        </View>

        <View style={styles.content}>
          {data.liveGame ? <LiveGameCard game={data.liveGame} /> : null}

          <View style={styles.primaryCard}>
            <LinearGradient
              colors={['#188046', '#209b4d']}
              start={{ x: 0, y: 0.25 }}
              end={{ x: 1, y: 0.75 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.primaryRing} />
            <Eyebrow style={{ color: '#b7e783' }}>YOUR NEXT ROUND</Eyebrow>
            <Text style={styles.primaryTitle}>Let&apos;s hit the course</Text>
            <Text style={styles.primaryCopy}>Pick a venue, invite your crew and keep every score in one place.</Text>
            <Pressable style={styles.ctaButton} onPress={() => router.push('/setup')}>
              <Text style={styles.ctaText}>Start a new game</Text>
              <View style={styles.ctaIcon}>
                <Icon name="arrow" size={20} color="#fff" />
              </View>
            </Pressable>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Your clubhouse</Text>
            <Text style={styles.sectionHint}>Everything you need</Text>
          </View>

          <View style={styles.quickGrid}>
            <Pressable style={[styles.quickCard, { backgroundColor: '#ffe9e4' }]} onPress={() => router.dismissTo('/setup')}>
              <View style={styles.quickIcon}>
                <Icon name="pin" color="#fff" />
              </View>
              <View style={styles.quickRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>Venues</Text>
                  <Text style={styles.quickSub}>{data.venueCount} saved</Text>
                </View>
                <Icon name="chevron" size={18} />
              </View>
            </Pressable>
            <Pressable style={[styles.quickCard, { backgroundColor: '#fff3c8' }]} onPress={() => router.dismissTo('/crew')}>
              <View style={[styles.quickIcon, { backgroundColor: colors.yellow }]}>
                <Icon name="users" />
              </View>
              <View style={styles.quickRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>Players</Text>
                  <Text style={styles.quickSub}>{data.players.length} in your crew</Text>
                </View>
                <Icon name="chevron" size={18} />
              </View>
            </Pressable>
          </View>

          {data.lastGame ? <LastGameCard game={data.lastGame} /> : <NoGamesCard />}
        </View>
      </ScrollView>
      <BottomNav active="home" />
    </View>
  );
}

function LiveGameCard({ game }: { game: GameDetail }) {
  const holeCount = game.course.holes.length;
  const hole = currentHoleIndex(game) + 1;
  const progress = `${(hole / Math.max(1, holeCount)) * 100}%` as const;
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveBlob} />
      <View style={styles.liveTop}>
        <View style={styles.liveStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.liveStatusText}>ROUND IN PROGRESS</Text>
        </View>
        <Text style={styles.liveStarted}>Started {formatDayTime(game.startedAt)}</Text>
      </View>
      <View style={styles.liveTitleRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ fontSize: 8, color: '#6c8f71', marginBottom: 5 }}>
            {`${BRAND} · ${game.course.venue.name}`.toUpperCase()}
          </Eyebrow>
          <Text style={styles.liveTitle}>{game.course.name}</Text>
        </View>
        <View style={styles.liveHole}>
          <Text style={styles.liveHoleNumber}>{hole}</Text>
          <Text style={styles.liveHoleOf}>OF {holeCount}</Text>
        </View>
      </View>
      <View style={styles.liveProgress}>
        <LinearGradient
          colors={[colors.green, colors.lime]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.liveProgressFill, { width: progress }]}
        />
        <View style={[styles.liveKnob, { left: progress }]} />
      </View>
      <View style={styles.liveFooter}>
        <View style={styles.livePlayers}>
          {game.gamePlayers.map(({ player }, i) => (
            <View key={player.id} style={[styles.livePlayer, { backgroundColor: playerColor(player, i) }]}>
              {player.photo ? (
                <Image source={{ uri: player.photo }} style={styles.livePlayerPhoto} contentFit="cover" />
              ) : (
                <Text style={styles.livePlayerText}>{player.name.slice(0, 1)}</Text>
              )}
            </View>
          ))}
          <Text style={styles.livePlayersCount}>{game.gamePlayers.length} players</Text>
        </View>
        <Pressable style={styles.resumeButton} onPress={() => router.push(`/game/${game.id}`)}>
          <Text style={styles.resumeText}>Resume game</Text>
          <Icon name="arrow" size={17} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/** Empty state for the "Last game" slot until a round has been finished. */
function NoGamesCard() {
  return (
    <View style={styles.recentCard}>
      <View style={styles.recentIcon}>
        <Icon name="flag" color="#348d45" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: '#8a9790' }}>LAST GAME</Eyebrow>
        <Text style={styles.recentTitle}>No finished rounds yet</Text>
        <Text style={styles.recentMeta}>Finish a round and your best score shows up here.</Text>
      </View>
      <View style={styles.winningScore}>
        <Text style={styles.winningNumber}>–</Text>
        <Text style={styles.winningLabel}>BEST</Text>
      </View>
    </View>
  );
}

function LastGameCard({ game }: { game: GameDetail }) {
  const best = bestTotal(game);
  return (
    <View style={styles.recentCard}>
      <View style={styles.recentIcon}>
        <Icon name="flag" color="#348d45" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: '#8a9790' }}>LAST GAME</Eyebrow>
        <Text style={styles.recentTitle}>{game.course.name}</Text>
        <Text style={styles.recentMeta}>
          {game.course.venue.name} · {game.course.holes.length} holes · {game.gamePlayers.length} players
        </Text>
      </View>
      <View style={styles.winningScore}>
        <Text style={styles.winningNumber}>{best ?? '–'}</Text>
        <Text style={styles.winningLabel}>BEST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  hero: {
    position: 'relative',
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroTop: { zIndex: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 22,
  },
  avatarText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 16 },
  heroCopy: { zIndex: 2, marginTop: 53 },
  heroKicker: { marginBottom: 8, color: '#8dcf59', fontSize: 10, fontFamily: fonts.bodyBold, letterSpacing: 2 },
  heroTitle: { color: '#fff', fontFamily: fonts.display, fontSize: 39, lineHeight: 38.2, letterSpacing: -0.975 },

  content: { paddingHorizontal: 20, paddingBottom: 28 },

  liveCard: {
    zIndex: 5,
    marginTop: -17,
    marginBottom: 14,
    padding: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4d9',
    borderRadius: 20,
    backgroundColor: '#fff',
    boxShadow: '0 12px 28px rgba(8, 61, 64, 0.14)',
  },
  liveBlob: {
    position: 'absolute',
    top: -47,
    right: -48,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(105, 183, 52, 0.08)',
  },
  liveTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  liveStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.red,
    boxShadow: '0 0 0 4px rgba(237, 27, 59, 0.1)',
  },
  liveStatusText: { color: colors.red, fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  liveStarted: { color: '#919c96', fontSize: 8, fontFamily: fonts.bodySemi },
  liveTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 21 },
  liveHole: {
    alignItems: 'center',
    minWidth: 46,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: '#edf4e8',
  },
  liveHoleNumber: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 20 },
  liveHoleOf: { marginTop: 2, color: '#7f9184', fontSize: 7, fontFamily: fonts.bodyBold },
  liveProgress: {
    height: 5,
    marginTop: 15,
    marginHorizontal: 3,
    marginBottom: 14,
    borderRadius: 5,
    backgroundColor: '#e7ebe4',
  },
  liveProgressFill: { height: '100%', borderRadius: 5 },
  liveKnob: {
    position: 'absolute',
    top: -3,
    width: 11,
    height: 11,
    marginLeft: -5.5,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 6,
    backgroundColor: colors.lime,
    boxShadow: '0 1px 4px rgba(8, 61, 64, 0.25)',
  },
  liveFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePlayers: { flexDirection: 'row', alignItems: 'center' },
  livePlayer: {
    width: 25,
    height: 25,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 13,
    overflow: 'hidden',
  },
  livePlayerPhoto: { width: '100%', height: '100%' },
  livePlayerText: { color: '#fff', fontFamily: fonts.display, fontSize: 9 },
  livePlayersCount: { marginLeft: 12, color: '#7f8e86', fontSize: 8, fontFamily: fonts.body },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.red,
  },
  resumeText: { color: '#fff', fontSize: 9, fontFamily: fonts.bodyBold },

  primaryCard: {
    zIndex: 4,
    padding: 24,
    overflow: 'hidden',
    borderRadius: 22,
    boxShadow: '0 13px 30px rgba(20, 111, 61, 0.25)',
  },
  primaryRing: {
    position: 'absolute',
    right: -22,
    bottom: -47,
    width: 132,
    height: 132,
    borderWidth: 22,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 66,
  },
  primaryTitle: { marginTop: 8, marginBottom: 6, color: '#fff', fontFamily: fonts.display, fontSize: 25 },
  primaryCopy: { width: '88%', color: 'rgba(255, 255, 255, 0.75)', fontSize: 13, lineHeight: 19.5, fontFamily: fonts.body },
  ctaButton: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 17,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  ctaText: { color: colors.ink, fontSize: 13, fontFamily: fonts.bodyBold },
  ctaIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.red,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 27,
    marginHorizontal: 2,
    marginBottom: 13,
  },
  sectionTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  sectionHint: { color: '#82908a', fontSize: 10, fontFamily: fonts.body },

  quickGrid: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, padding: 17, borderRadius: 18 },
  quickIcon: {
    width: 38,
    height: 38,
    marginBottom: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.red,
  },
  quickRow: { flexDirection: 'row', alignItems: 'center' },
  quickTitle: { color: colors.ink, fontSize: 16, fontFamily: fonts.bodyBold },
  quickSub: { marginTop: 3, color: '#7b8782', fontSize: 10, fontFamily: fonts.body },

  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e3da',
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  recentIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#e6f2df',
  },
  recentTitle: { marginTop: 4, color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  recentMeta: { marginTop: 2, color: '#7f8d86', fontSize: 9, fontFamily: fonts.body },
  winningScore: { alignItems: 'center' },
  winningNumber: { color: colors.red, fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 22 },
  winningLabel: { color: '#8a9790', fontSize: 8, fontFamily: fonts.body },
});
