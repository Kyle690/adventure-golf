import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { GameCard } from '@/components/GameCard';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { SectionTitle } from '@/components/onboarding/Form';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { listPlayers, listVenueGames, loadVenueSummary } from '@/db/queries';
import { formatVsPar } from '@/lib/stats';
import { timeAgo } from '@/lib/time';
import type { CourseSummary } from '@/lib/venue-stats';
import { useRoundDraft } from '@/state/round-draft';
import { BRAND, colors, fonts } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/venues');
}

/**
 * Venue detail: header, venue stats, its courses (tap to edit, Play to start a round) and the
 * games played here across all courses, newest first. Abandoned rounds are hidden.
 */
export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const venueId = Number(id);
  const insets = useSafeAreaInsets();
  const draft = useRoundDraft();
  const { data } = useDbQuery(async () => {
    const [venue, players, games] = await Promise.all([loadVenueSummary(venueId), listPlayers(), listVenueGames(venueId)]);
    return { venue, games, names: new Map(players.map((p) => [p.id, p.isOwner ? 'You' : p.name])) };
  }, id);

  if (!data) return <View style={styles.screen} />;
  const venue = data.venue;
  if (!venue) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', padding: 24 }]}>
        <Text style={styles.missing}>This venue no longer exists.</Text>
        <WideCta label="Back to venues" onPress={goBack} />
      </View>
    );
  }

  const play = (courseId: number | null) => {
    draft.setVenueId(venue.id);
    draft.setCourseId(courseId);
    router.push('/setup');
  };
  const best = venue.ownerBest;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          {venue.image ? (
            <>
              <Image source={{ uri: venue.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(6,50,54,0.55)', 'rgba(6,50,54,0.92)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LeafDecoration />
          )}
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back to venues" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>{`${BRAND} VENUE`.toUpperCase()}</Eyebrow>
          <Text style={styles.title}>{venue.name}</Text>
          <View style={styles.meta}>
            {venue.address ? (
              <View style={styles.metaChip}>
                <Icon name="pin" size={15} color="rgba(255,255,255,0.78)" />
                <Text style={styles.metaText}>{venue.address}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Icon name="flag" size={15} color="rgba(255,255,255,0.78)" />
              <Text style={styles.metaText}>
                {venue.courseCount} {venue.courseCount === 1 ? 'course' : 'courses'} · {venue.holeCount} holes
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <Stat label="GAMES" value={String(venue.gamesPlayed)} sub="Finished here" />
            <Stat label="LAST PLAYED" value={venue.lastPlayed ? timeAgo(venue.lastPlayed) : 'Never'} sub="Most recent" small />
            <Stat
              label="YOUR BEST"
              value={best ? String(best.total) : '–'}
              sub={best ? `${formatVsPar(best.vsPar)} · ${best.courseName}` : 'No full round yet'}
              accent
            />
          </View>

          <SectionTitle aside={`${venue.courseCount} ${venue.courseCount === 1 ? 'course' : 'courses'}`}>Courses</SectionTitle>
          <View style={{ gap: 10 }}>
            {venue.courses.map((course) => (
              <CourseCard key={course.id} course={course} names={data.names} onPlay={() => play(course.id)} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a course"
              onPress={() => router.push({ pathname: '/course/new', params: { venueId: String(venue.id) } })}
              style={({ pressed }) => [styles.addCourse, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.addCourseIcon}>
                <Icon name="plus" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>{venue.courses.length ? 'Add a course' : 'No courses yet'}</Text>
                <Text style={styles.emptyCopy}>
                  {venue.courses.length
                    ? `Another layout at ${venue.name}? Set its holes and pars.`
                    : 'Add a course to start playing here: name, holes and par for each.'}
                </Text>
              </View>
              <Icon name="chevron" size={16} color={colors.green} />
            </Pressable>
          </View>

          <SectionTitle aside={`${data.games.length} ${data.games.length === 1 ? 'game' : 'games'}`}>Games played here</SectionTitle>
          {data.games.length ? (
            <View style={{ gap: 9 }}>
              {data.games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyCopy}>Rounds you play at {venue.name} will show up here.</Text>
            </View>
          )}

          {venue.courses.length ? (
            <WideCta label="Start a game here" onPress={() => play(venue.courses[0].id)} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function CourseCard({ course, names, onPlay }: { course: CourseSummary; names: Map<number, string>; onPlay: () => void }) {
  const best = course.best;
  const edit = () => router.push(`/course/${course.id}`);
  // The card body opens the course editor; Play is a sibling button (no nested buttons on web).
  return (
    <View style={styles.course}>
      <View style={styles.courseTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${course.name}`}
          onPress={edit}
          style={({ pressed }) => [styles.courseInfo, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.courseIcon}>
            {course.image ? (
              <Image source={{ uri: course.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Icon name="flag" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>{course.holes} HOLE COURSE</Text>
            <Text style={styles.courseName} numberOfLines={1}>
              {course.name}
            </Text>
            <View style={styles.editRow}>
              <Text style={styles.courseSub}>
                {course.lastPlayed ? `Last played ${timeAgo(course.lastPlayed)}` : 'Not played yet'} ·
              </Text>
              <Icon name="edit" size={12} color={colors.green} />
              <Text style={styles.editText}>Edit</Text>
            </View>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Play ${course.name}`} onPress={onPlay} style={styles.playButton}>
          <Text style={styles.playText}>Play</Text>
          <Icon name="arrow" size={14} color="#fff" />
        </Pressable>
      </View>
      <Pressable accessible={false} onPress={edit} style={styles.tiles}>
        <Tile label="HOLES" value={String(course.holes)} />
        <Tile label="PAR" value={String(course.par)} />
        <Tile label="GAMES" value={String(course.gamesPlayed)} />
        <Tile
          label="BEST"
          value={best ? String(best.total) : '–'}
          sub={best ? `${names.get(best.playerId) ?? 'Player'} · ${formatVsPar(best.vsPar)}` : undefined}
        />
      </Pressable>
    </View>
  );
}

function Stat({ label, value, sub, small, accent }: { label: string; value: string; sub: string; small?: boolean; accent?: boolean }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={[styles.statLabel, accent && { color: '#b7e783' }]}>{label}</Text>
      <Text style={[styles.statValue, small && { fontSize: 14 }, accent && { color: '#fff' }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statSub, accent && { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { textAlign: 'center', color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  header: {
    paddingHorizontal: 21,
    paddingBottom: 23,
    overflow: 'hidden',
    backgroundColor: colors.deep,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
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
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  metaText: { color: '#fff', fontSize: 9, fontFamily: fonts.bodyBold },
  content: { paddingTop: 18, paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  statAccent: { borderColor: colors.green, backgroundColor: colors.green },
  statLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  statValue: { marginTop: 4, color: colors.ink, fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30 },
  statSub: { color: '#8c9992', fontSize: 8, lineHeight: 12, fontFamily: fonts.body },
  course: { padding: 13, borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 15, backgroundColor: '#fff' },
  courseTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Setup course card icon tile.
  courseIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 13,
    backgroundColor: colors.yellow,
  },
  kicker: { color: colors.green, fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  courseName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 22 },
  courseInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseSub: { color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  editText: { color: colors.green, fontSize: 10, fontFamily: fonts.bodyBold },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.red,
  },
  playText: { color: '#fff', fontSize: 10, fontFamily: fonts.bodyBold },
  tiles: { flexDirection: 'row', gap: 6, marginTop: 12 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 11, backgroundColor: '#edf4e8' },
  tileLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.bodyBold, letterSpacing: 1 },
  tileValue: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  tileSub: { color: '#7f8e86', fontSize: 7, lineHeight: 10, fontFamily: fonts.body },
  empty: {
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  addCourse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  addCourseIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.green,
  },
  emptyTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  emptyCopy: { color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
});
