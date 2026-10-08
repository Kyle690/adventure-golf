import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CourseFormFields, useCourseForm } from '@/components/CourseForm';
import { CourseFormPage, courseFormPageStyles, goBackTo } from '@/components/CourseFormPage';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { countCourseGames, getCourse, updateCourse } from '@/db/queries';
import { colors, fonts } from '@/theme';

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;

/** Edit a course: name, photo, number of holes, par per hole, optional length/difficulty. */
export default function CourseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useDbQuery(() => getCourse(Number(id)).then((c) => c ?? null), id);
  if (data === undefined) return <View style={courseFormPageStyles.screen} />;
  if (data === null) {
    return (
      <View style={[courseFormPageStyles.screen, { justifyContent: 'center', padding: 24 }]}>
        <Text style={courseFormPageStyles.missing}>This course no longer exists.</Text>
        <WideCta label="Back" onPress={() => goBackTo('/venues')} />
      </View>
    );
  }
  // Keyed so the form initialises from the loaded course.
  return <CourseEditor key={data.id} course={data} />;
}

function CourseEditor({ course }: { course: Course }) {
  const form = useCourseForm(course);
  const played = countCourseGames(course.id);
  const back = () => goBackTo(`/venue/${course.venueId}`);

  const save = () => {
    if (!form.valid) return;
    updateCourse(course.id, form.values());
    back();
  };

  return (
    <CourseFormPage
      eyebrow={`EDIT COURSE · ${course.venue.name.toUpperCase()}`}
      title={form.name.trim() || course.name}
      subtitle="Change the name, photo, holes and pars for future games."
      onBack={back}
    >
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
    </CourseFormPage>
  );
}

const styles = StyleSheet.create({
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
