import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, NAV_CLEARANCE } from '@/components/BottomNav';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { ParEditor } from '@/components/ParEditor';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { lastPlayedByCourse, listVenues, setHolePar } from '@/db/queries';
import { totalPar } from '@/lib/game';
import { timeAgo } from '@/lib/time';
import { useRoundDraft } from '@/state/round-draft';
import { BRAND, colors, fonts } from '@/theme';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const draft = useRoundDraft();
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const { data } = useDbQuery(async () => {
    const [venues, lastPlayed] = await Promise.all([listVenues(), lastPlayedByCourse()]);
    return { venues, lastPlayed };
  });

  const venues = data?.venues ?? [];
  const venue = venues.find((v) => v.id === draft.venueId) ?? venues[0];
  const course = venue?.courses.find((c) => c.id === draft.courseId) ?? venue?.courses[0];

  // Default the draft to the first venue/course, as the prototype pre-selects Sandton / The Tropical Trail.
  useEffect(() => {
    if (venue && draft.venueId !== venue.id) draft.setVenueId(venue.id);
    if (course && draft.courseId !== course.id) draft.setCourseId(course.id);
    if (venue && !course && draft.courseId !== null) draft.setCourseId(null);
  }, [venue, course, draft]);

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
        <View style={[styles.header, { paddingTop: Math.max(20, insets.top) }]}>
          <View style={styles.headerBrand}>
            <Logo compact style={{ width: 76 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ marginBottom: 5, color: '#8bcd58' }}>NEW GAME</Eyebrow>
            <Text style={styles.headerTitle}>Choose your course</Text>
          </View>
        </View>

        <View style={styles.content}>
          <StepLabel step={1} label="Select a venue" first />
          <View style={{ gap: 10 }}>
            {venues.map((v) => {
              const selected = v.id === venue?.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    draft.setVenueId(v.id);
                    draft.setCourseId(v.courses[0]?.id ?? null);
                    setEditingCourseId(null);
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
                    {v.address ? <Text style={styles.cardSub}>{v.address}</Text> : null}
                  </View>
                  {selected ? (
                    <View style={styles.selectCheck}>
                      <Icon name="check" size={16} strokeWidth={2.6} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {/* Present but not wired up in the prototype either. */}
          <AddRow label="Create a new venue" />

          <StepLabel step={2} label="Select a course" />
          <View style={{ gap: 10 }}>
            {venue?.courses.map((c) => {
              const editing = editingCourseId === c.id;
              const par = totalPar(c.holes);
              const lastPlayed = data?.lastPlayed.get(c.id);
              const selected = c.id === course?.id && (venue?.courses.length ?? 0) > 1;
              return (
                <View key={c.id}>
                  <Pressable
                    onPress={() => {
                      draft.setCourseId(c.id);
                      setEditingCourseId(editing ? null : c.id);
                    }}
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
                        Par {par} · {lastPlayed ? `Last played ${timeAgo(lastPlayed)}` : 'Not played yet'}
                      </Text>
                    </View>
                    <Icon name={editing ? 'close' : 'edit'} size={19} color={colors.green} />
                  </Pressable>

                  {editing ? (
                    <ParEditor
                      pars={c.holes.map((h) => h.par)}
                      onChange={(index, next) => setHolePar(c.holes[index].id, next)}
                      onDone={() => setEditingCourseId(null)}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          <AddRow label="Create a new course" />

          <WideCta label="Choose players" disabled={!course} onPress={() => router.push('/players')} />
        </View>
      </ScrollView>
      <BottomNav active="setup" />
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

function AddRow({ label }: { label: string }) {
  return (
    <Pressable style={styles.addRow}>
      <Icon name="plus" size={18} color={colors.green} />
      <Text style={styles.addRowText}>{label}</Text>
    </Pressable>
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
  headerBrand: {
    width: 68,
    height: 56,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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

  addRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
    marginLeft: 5,
    padding: 5,
  },
  addRowText: { color: colors.green, fontSize: 11, fontFamily: fonts.bodyBold },

});
