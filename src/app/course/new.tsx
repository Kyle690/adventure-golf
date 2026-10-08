import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CourseFormFields, useCourseForm } from '@/components/CourseForm';
import { CourseFormPage, courseFormPageStyles, goBackTo } from '@/components/CourseFormPage';
import { Text } from '@/components/Text';
import { WideCta } from '@/components/WideCta';
import { useDbQuery } from '@/db/hooks';
import { createCourse, getVenue } from '@/db/queries';
import { useRoundDraft } from '@/state/round-draft';

/**
 * Add a course to a venue (venue detail "Add a course", New game "Create a new course").
 * `select=1` (from New game) also selects the new course for the round being set up.
 */
export default function CourseCreateScreen() {
  const { venueId, select } = useLocalSearchParams<{ venueId: string; select?: string }>();
  const id = Number(venueId);
  const draft = useRoundDraft();
  const form = useCourseForm(null);
  const { data: venue } = useDbQuery(() => getVenue(id).then((v) => v ?? null), venueId);
  const back = () => goBackTo(id ? `/venue/${id}` : '/venues');

  if (venue === undefined) return <View style={courseFormPageStyles.screen} />;
  if (venue === null) {
    return (
      <View style={[courseFormPageStyles.screen, { justifyContent: 'center', padding: 24 }]}>
        <Text style={courseFormPageStyles.missing}>This venue no longer exists.</Text>
        <WideCta label="Back" onPress={() => goBackTo('/venues')} />
      </View>
    );
  }

  const save = () => {
    if (!form.valid) return;
    const course = createCourse(venue.id, form.values());
    if (select === '1') {
      draft.setVenueId(venue.id);
      draft.setCourseId(course.id);
    }
    back();
  };

  return (
    <CourseFormPage
      eyebrow={`NEW COURSE · ${venue.name.toUpperCase()}`}
      title={form.name.trim() || 'Add a course'}
      subtitle={`Name it, set the number of holes and the par for each one at ${venue.name}.`}
      onBack={back}
    >
      <CourseFormFields form={form} previewSub={venue.name} />
      <WideCta label="Create course" disabled={!form.valid} onPress={save} />
    </CourseFormPage>
  );
}
