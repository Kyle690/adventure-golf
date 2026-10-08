import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseFormFields, useCourseForm } from '@/components/CourseForm';
import { Eyebrow } from '@/components/Eyebrow';
import { Icon } from '@/components/Icon';
import { LeafDecoration } from '@/components/LeafDecoration';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { countCourseGames, getCourse, updateCourse } from '@/db/queries';
import { colors, fonts } from '@/theme';

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/venues');
}

/** Edit a course: name, photo, number of holes, par per hole, optional length/difficulty. */
export default function CourseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useDbQuery(() => getCourse(Number(id)).then((c) => c ?? null), id);
  if (data === undefined) return <View style={styles.screen} />;
  if (data === null) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', padding: 24 }]}>
        <Text style={styles.missing}>This course no longer exists.</Text>
        <WideCta label="Back" onPress={goBack} />
      </View>
    );
  }
  // Keyed so the form initialises from the loaded course.
  return <CourseEditor key={data.id} course={data} />;
}

function CourseEditor({ course }: { course: Course }) {
  const insets = useSafeAreaInsets();
  const form = useCourseForm(course);
  const played = countCourseGames(course.id);

  const save = () => {
    if (!form.valid) return;
    updateCourse(course.id, form.values());
    goBack();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
          <LeafDecoration />
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Back" onPress={goBack} style={styles.roundButton}>
              <Icon name="back" color="#fff" />
            </Pressable>
            <Logo compact />
            <View style={{ width: 38 }} />
          </View>
          <Eyebrow style={{ color: '#90ce5e', marginBottom: 7 }}>{`EDIT COURSE · ${course.venue.name.toUpperCase()}`}</Eyebrow>
          <Text style={styles.title}>{form.name.trim() || course.name}</Text>
          <Text style={styles.subtitle}>Change the name, photo, holes and pars for future games.</Text>
        </View>
        <View style={styles.content}>
          <CourseFormFields form={form} previewSub={course.venue.name} />
          {played > 0 ? (
            <View style={styles.note}>
              <Icon name="history" size={16} color={colors.green} />
              <Text style={styles.noteText}>
                Changes apply to new games. The {played} {played === 1 ? 'game' : 'games'} already played here keep the
                holes and pars they were played with.
              </Text>
            </View>
          ) : null}
          <WideCta label="Save course" disabled={!form.valid} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { textAlign: 'center', color: colors.ink, fontFamily: fonts.display, fontSize: 18 },
  header: {
    paddingHorizontal: 21,
    paddingBottom: 25,
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
  subtitle: { marginTop: 6, maxWidth: 310, color: 'rgba(255,255,255,0.63)', fontSize: 12, fontFamily: fonts.body },
  content: { paddingTop: 20, paddingHorizontal: 20 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cfe3c4',
    borderRadius: 14,
    backgroundColor: '#f1f7ec',
  },
  noteText: { flex: 1, color: colors.ink, fontSize: 10, fontFamily: fonts.bodySemi },
});
