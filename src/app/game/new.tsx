import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { lastPlayedByCourse, listVenues } from '@/db/queries';
import { totalPar } from '@/lib/game';
import { timeAgo } from '@/lib/time';
import { BRAND, colors, fonts } from '@/theme';

/**
 * Game flow step 1, pick-only: choose a venue, then one of its courses; that enables "Choose
 * players". Venues/courses are created and edited in the Venues tab, not here.
 * ?venueId= preselects a venue (venue detail "Start a game here").
 */
export default function SelectCourseScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ venueId?: string }>();
  const [pickedVenueId, setPickedVenueId] = useState<number | null>(params.venueId ? Number(params.venueId) : null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const { data } = useDbQuery(async () => {
    const [venues, lastPlayed] = await Promise.all([listVenues(), lastPlayedByCourse()]);
    return { venues, lastPlayed };
  });

  const venues = data?.venues ?? [];
  // With a single venue there is nothing to choose, so it starts selected.
  const venue = venues.find((v) => v.id === pickedVenueId) ?? (venues.length === 1 ? venues[0] : undefined);
  const course = venue?.courses.find((c) => c.id === courseId);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(105,183,52,0.06)', 'transparent']}
        locations={[0, 0.35]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.header, { paddingTop: Math.max(20, insets.top) }]}>
          <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.roundButton}>
            <Icon name="back" color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ marginBottom: 5, color: '#8bcd58' }}>NEW GAME</Eyebrow>
            <Text style={styles.headerTitle}>Choose your course</Text>
          </View>
          <Logo width={118} />
        </View>

        <View style={styles.content}>
          <StepLabel step={1} label="Select a venue" first />
          <View style={{ gap: 10 }}>
            {venues.map((v) => {
              const selected = v.id === venue?.id;
              return (
                <Pressable
                  key={v.id}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  accessibilityLabel={`Venue ${v.name}`}
                  onPress={() => {
                    setPickedVenueId(v.id);
                    if (v.id !== venue?.id) setCourseId(null);
                  }}
                  style={[styles.card, selected && styles.cardSelected]}
                >
                  <View style={[styles.cardIcon, { backgroundColor: colors.green }]}>
                    {v.image ? (
                      <Image source={{ uri: v.image }} style={styles.cardImage} contentFit="cover" />
                    ) : (
                      <Icon name="pin" color="#fff" />
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardKicker}>{BRAND.toUpperCase()}</Text>
                    <Text style={styles.cardTitle}>{v.name}</Text>
                    <Text style={styles.cardSub}>
                      {v.courses.length} {v.courses.length === 1 ? 'course' : 'courses'}
                      {v.address ? ` · ${v.address}` : ''}
                    </Text>
                  </View>
                  {selected ? (
                    <View style={styles.selectCheck}>
                      <Icon name="check" size={16} strokeWidth={2.6} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            {data && venues.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No venues yet</Text>
                <Text style={styles.emptyCopy}>Add a venue and its courses in the Venues tab first.</Text>
              </View>
            ) : null}
          </View>

          {venue ? (
            <>
              <StepLabel step={2} label="Select a course" />
              <View style={{ gap: 10 }}>
                {venue.courses.map((c) => {
                  const selected = c.id === course?.id;
                  const lastPlayed = data?.lastPlayed.get(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="radio"
                      aria-checked={selected}
                      accessibilityLabel={`Course ${c.name}`}
                      onPress={() => setCourseId(c.id)}
                      style={[styles.card, selected && styles.cardSelected]}
                    >
                      <View style={[styles.cardIcon, { backgroundColor: colors.yellow }]}>
                        {c.image ? (
                          <Image source={{ uri: c.image }} style={styles.cardImage} contentFit="cover" />
                        ) : (
                          <Icon name="flag" />
                        )}
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardKicker}>{c.holes.length} HOLE COURSE</Text>
                        <Text style={styles.cardTitle}>{c.name}</Text>
                        <Text style={styles.cardSub}>
                          Par {totalPar(c.holes)} · {lastPlayed ? `Last played ${timeAgo(lastPlayed)}` : 'Not played yet'}
                        </Text>
                      </View>
                      {selected ? (
                        <View style={styles.selectCheck}>
                          <Icon name="check" size={16} strokeWidth={2.6} color="#fff" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                {venue.courses.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>No courses at {venue.name} yet</Text>
                    <Text style={styles.emptyCopy}>Add one from the venue in the Venues tab.</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          <WideCta
            label="Choose players"
            disabled={!course}
            onPress={() => course && router.push({ pathname: '/game/players', params: { courseId: String(course.id) } })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function StepLabel({ step, label, first }: { step: number; label: string; first?: boolean }) {
  return (
    <View style={[styles.stepLabel, !first && { marginTop: 27 }]}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{step}</Text>
      </View>
      <Text style={styles.stepText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 18,
    backgroundColor: colors.deep,
  },
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
  headerTitle: { color: '#fff', fontFamily: fonts.display, fontSize: 24 },
  content: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 28 },

  stepLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2, marginBottom: 12 },
  stepBadge: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.green,
  },
  stepNumber: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 11 },
  stepText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#d8dfd6',
    borderRadius: 17,
    backgroundColor: '#fff',
  },
  cardSelected: { borderColor: '#65ab50', boxShadow: '0 7px 17px rgba(29, 111, 61, 0.09)' },
  cardIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 13,
  },
  // Venue/course photos added during onboarding replace the icon.
  cardImage: { width: '100%', height: '100%' },
  cardBody: { flex: 1, minWidth: 0 },
  cardKicker: { marginBottom: 3, color: '#93a099', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.04 },
  cardTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },
  // Inline <small> in the prototype sits on a 16px parent line box, hence the 24px line height.
  cardSub: { color: '#819087', fontSize: 10, lineHeight: 24, fontFamily: fonts.body },
  selectCheck: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.green,
  },

  empty: {
    padding: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  emptyTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  emptyCopy: { marginTop: 2, color: '#82908a', fontSize: 10, fontFamily: fonts.body },
});
