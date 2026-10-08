import { CourseFormFields, useCourseForm } from '@/components/CourseForm';
import { StepPage } from '@/components/onboarding/StepPage';
import { WideCta } from '@/components/WideCta';
import { saveCourse, type OnboardingState } from '@/db/queries';

export function CourseStep({
  state,
  onSaved,
  topBar,
}: {
  state: OnboardingState;
  onSaved: () => void;
  topBar: React.ReactNode;
}) {
  const course = state.course;
  const form = useCourseForm(course);
  const venueId = state.venue?.id;

  const save = () => {
    if (!form.valid || !venueId) return;
    saveCourse({ id: course?.id, venueId, ...form.values() });
    onSaved();
  };

  return (
    <StepPage
      topBar={topBar}
      step={3}
      total={4}
      eyebrow="YOUR COURSE"
      title="Add a course"
      subtitle={`Which course do you play at ${state.venue?.name ?? 'your venue'}? Set its holes and pars.`}
    >
      <CourseFormFields form={form} />
      <WideCta label="Save course" disabled={!form.valid || !venueId} onPress={save} />
    </StepPage>
  );
}
