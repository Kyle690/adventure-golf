import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Celebration } from '@/components/celebration/Celebration';
import { Icon } from '@/components/Icon';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { getOnboardingState } from '@/db/queries';
import { totalPar } from '@/lib/game';
import { firstName } from '@/lib/players';
import { colors, fonts } from '@/theme';

/**
 * Celebration shown once, right after "Create" on the last onboarding step: recaps what was set up.
 * (The animated layout is the shared <Celebration>, also shown when a round is confirmed.)
 */
export default function OnboardingCompleteScreen() {
  // The venue/course created during onboarding are remembered in app_meta.
  const { data } = useDbQuery(getOnboardingState);
  const name = firstName(data?.owner?.name);
  const venue = data?.venue;
  const course = data?.course;
  const crew = data?.crew ?? [];

  return (
    <Celebration
      eyebrow="ONBOARDING COMPLETE"
      title={data ? `You're all set,\n${name || 'golfer'}!` : ' '}
      subtitle="Welcome to the club. Your clubhouse is ready: here's everything you just created."
      actions={<WideCta label="Go to Home" onPress={() => router.replace('/')} />}
      card={
        data ? (
          <>
            {venue ? (
              <View>
                {venue.image ? (
                  <Image source={{ uri: venue.image }} style={styles.venuePhoto} contentFit="cover" accessibilityLabel="Venue photo" />
                ) : null}
                <View style={styles.section}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.green }]}>
                    <Icon name="pin" color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kicker}>YOUR VENUE</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {venue.name}
                    </Text>
                    {venue.address ? <Text style={styles.cardSub}>{venue.address}</Text> : null}
                  </View>
                </View>
              </View>
            ) : null}

            {course ? (
              <View style={[styles.section, styles.divided]}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.yellow }]}>
                  {course.image ? (
                    <Image source={{ uri: course.image }} style={styles.thumb} contentFit="cover" accessibilityLabel="Course photo" />
                  ) : (
                    <Icon name="flag" />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.kicker}>YOUR COURSE</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {course.name}
                  </Text>
                  <View style={styles.stats}>
                    <Stat value={course.holes.length} label="HOLES" />
                    <Stat value={totalPar(course.holes)} label="TOTAL PAR" />
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.divided}>
              <View style={styles.crewHeading}>
                <Text style={styles.kicker}>YOUR CREW</Text>
                <Text style={styles.crewCount}>
                  {crew.length} {crew.length === 1 ? 'PLAYER' : 'PLAYERS'}
                </Text>
              </View>
              <View style={styles.crew}>
                {crew.map((player, index) => (
                  <View key={player.id} style={styles.crewMember}>
                    <PlayerAvatar player={player} index={index} size={34} />
                    <Text style={styles.crewName} numberOfLines={1}>
                      {player.isOwner ? 'You' : player.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null
      }
    />
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
  venuePhoto: { width: '100%', aspectRatio: 16 / 7, backgroundColor: '#e9f1e5' },
  section: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 17 },
  divided: { marginHorizontal: 17, paddingHorizontal: 0, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#edf0ea' },
  // Icon tiles from the Setup venue/course cards.
  sectionIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 13,
  },
  thumb: { width: '100%', height: '100%' },
  kicker: { color: colors.green, fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  cardTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  cardSub: { marginTop: 1, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  stats: { flexDirection: 'row', gap: 8, marginTop: 9 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 11, backgroundColor: '#edf4e8' },
  statValue: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24 },
  statLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  crewHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crewCount: { color: '#7b8c83', fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  crew: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 11 },
  crewMember: { alignItems: 'center', gap: 4, width: 48 },
  crewName: { maxWidth: 48, color: '#5f6f67', fontSize: 9, fontFamily: fonts.bodySemi },
});
