import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { GolfBall } from '@/components/GolfBall';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { BouncingBall } from '@/components/onboarding/BouncingBall';
import { Confetti } from '@/components/onboarding/Confetti';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { getLiveGame, getOwner } from '@/db/queries';
import { totalPar } from '@/lib/game';
import { firstName } from '@/lib/players';
import { BRAND, colors, fonts } from '@/theme';

/** Celebration shown once, right after "Start game" on the last onboarding step. */
export default function OnboardingCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useDbQuery(async () => {
    const [owner, game] = await Promise.all([getOwner(), getLiveGame()]);
    return { owner, game };
  });
  const name = firstName(data?.owner?.name);
  const game = data?.game;

  return (
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
          <Eyebrow style={{ marginBottom: 9, color: '#90ce5e', textAlign: 'center' }}>ONBOARDING COMPLETE</Eyebrow>
          <Text style={styles.title}>{data ? `You're all set,\n${name || 'golfer'}!` : ' '}</Text>
          <Text style={styles.subtitle}>
            Welcome to the club. Your clubhouse is ready and your first round is waiting on the first tee.
          </Text>
        </Animated.View>

        {game ? (
          <Animated.View entering={FadeInDown.duration(500).delay(320)} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.status}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>FIRST ROUND READY</Text>
              </View>
            </View>
            <Eyebrow style={{ fontSize: 8, color: '#6c8f71', marginBottom: 5 }}>
              {`${BRAND} · ${game.course.venue.name}`.toUpperCase()}
            </Eyebrow>
            <Text style={styles.cardTitle}>{game.course.name}</Text>
            <View style={styles.stats}>
              <Stat value={game.course.holes.length} label="HOLES" />
              <Stat value={totalPar(game.course.holes)} label="PAR" />
              <Stat value={game.gamePlayers.length} label={game.gamePlayers.length === 1 ? 'PLAYER' : 'PLAYERS'} />
            </View>
            <View style={styles.crew}>
              {game.gamePlayers.map(({ player }, index) => (
                <View key={player.id} style={styles.crewMember}>
                  <PlayerAvatar player={player} index={index} size={30} />
                  <Text style={styles.crewName} numberOfLines={1}>
                    {player.isOwner ? 'You' : player.name}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(500).delay(480)}>
          <WideCta label="Go to Home" onPress={() => router.replace('/')} />
        </Animated.View>
      </ScrollView>
      <Confetti />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: colors.deep },
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
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
  },
  cardTop: { flexDirection: 'row', marginBottom: 13 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.red,
    boxShadow: '0 0 0 4px rgba(237, 27, 59, 0.1)',
  },
  statusText: { color: colors.red, fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  cardTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 22 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: '#edf4e8' },
  statValue: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26 },
  statLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  crew: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 },
  crewMember: { alignItems: 'center', gap: 4, width: 46 },
  crewName: { maxWidth: 46, color: '#5f6f67', fontSize: 9, fontFamily: fonts.bodySemi },
});
