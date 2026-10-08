import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Keyboard, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { StepDots } from '@/components/onboarding/StepDots';
import { CourseStep } from '@/components/onboarding/steps/CourseStep';
import { CrewStep } from '@/components/onboarding/steps/CrewStep';
import { OwnerStep } from '@/components/onboarding/steps/OwnerStep';
import { VenueStep } from '@/components/onboarding/steps/VenueStep';
import { useDbQuery } from '@/db/hooks';
import { finishOnboarding, getOnboardingState, type OnboardingState } from '@/db/queries';
import { colors } from '@/theme';

const STEP_COUNT = 4;
const SLIDE = { duration: 420, easing: Easing.out(Easing.cubic) };

/** How many steps are already saved in SQLite (owner -> venue -> course), i.e. the furthest reachable page. */
function savedSteps(state: OnboardingState) {
  if (!state.owner) return 0;
  if (!state.venue) return 1;
  if (!state.course) return 2;
  return 3;
}

export default function OnboardingScreen() {
  const { data } = useDbQuery(getOnboardingState);
  // Wait for the first read so the pager can open on the first unsaved step (resume after relaunch).
  if (!data) return <View style={styles.screen} />;
  return <OnboardingPager state={data} />;
}

function OnboardingPager({ state }: { state: OnboardingState }) {
  const saved = savedSteps(state);
  const [page, setPage] = useState(saved);
  // Highest page the user may swipe/scroll to: never past the first unsaved step.
  const [unlocked, setUnlocked] = useState(saved);
  const maxPage = Math.max(unlocked, saved);

  const [pageWidth, setPageWidth] = useState(0);
  const width = useSharedValue(0);
  const position = useSharedValue(saved);
  const dragStart = useSharedValue(0);
  const maxPageSV = useSharedValue(maxPage);

  useEffect(() => {
    maxPageSV.set(maxPage);
  }, [maxPage, maxPageSV]);

  const goTo = useCallback(
    (target: number) => {
      Keyboard.dismiss();
      setPage(target);
      position.set(withTiming(target, SLIDE));
    },
    [position],
  );

  /** Called by a step after its primary button has saved to SQLite. */
  const advance = (from: number) => {
    const next = Math.min(STEP_COUNT - 1, from + 1);
    setUnlocked((u) => Math.max(u, next));
    maxPageSV.set(Math.max(maxPageSV.get(), next));
    goTo(next);
  };

  const create = () => {
    if (!state.course) return;
    finishOnboarding();
    router.replace('/onboarding/complete');
  };

  // Android back button steps backwards through the carousel.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 0) return false;
      goTo(page - 1);
      return true;
    });
    return () => sub.remove();
  }, [page, goTo]);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onStart(() => {
      cancelAnimation(position);
      dragStart.set(position.get());
    })
    .onUpdate((event) => {
      const w = width.get();
      if (!w) return;
      const max = maxPageSV.get();
      let next = dragStart.get() - event.translationX / w;
      // Rubber-band past the first step and past the furthest saved step.
      if (next < 0) next *= 0.3;
      else if (next > max) next = max + (next - max) * 0.3;
      position.set(next);
    })
    .onEnd((event) => {
      const w = width.get() || 1;
      const from = Math.round(dragStart.get());
      const projected = position.get() - (event.velocityX / w) * 0.2;
      const target = Math.max(0, Math.min(maxPageSV.get(), from + 1, Math.max(from - 1, Math.round(projected))));
      position.set(withTiming(target, SLIDE));
      scheduleOnRN(setPage, target);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -position.get() * width.get() }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const w = event.nativeEvent.layout.width;
    width.set(w);
    setPageWidth(w);
  };

  // Each step owns its header bar (it scrolls with the step); the dots follow the shared position.
  const topBar = (index: number) => (
    <View style={styles.topBar}>
      <View style={styles.side}>
        {index > 0 ? (
          <Pressable accessibilityLabel="Previous step" onPress={() => goTo(index - 1)} style={styles.roundButton}>
            <Icon name="back" color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <Logo compact />
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        <StepDots count={STEP_COUNT} position={position} unlocked={maxPage} />
      </View>
    </View>
  );

  const steps = [
    <OwnerStep key="owner" state={state} topBar={topBar(0)} onSaved={() => advance(0)} />,
    <VenueStep key="venue" state={state} topBar={topBar(1)} onSaved={() => advance(1)} />,
    <CourseStep key="course" state={state} topBar={topBar(2)} onSaved={() => advance(2)} />,
    <CrewStep key="crew" state={state} topBar={topBar(3)} onCreate={create} />,
  ];

  return (
    <View style={styles.screen} onLayout={onLayout}>
      {pageWidth > 0 ? (
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.row, { width: pageWidth * STEP_COUNT }, rowStyle]}>
            {steps.map((step, index) => (
              <View
                key={index}
                style={{ width: pageWidth }}
                pointerEvents={index === page ? 'auto' : 'none'}
                accessibilityElementsHidden={index !== page}
                importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}
                aria-hidden={index !== page}
              >
                {step}
              </View>
            ))}
          </Animated.View>
        </GestureDetector>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: colors.cream },
  row: { flex: 1, flexDirection: 'row' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 70, height: 38, justifyContent: 'center' },
  // Same round glass button as the Game header.
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
});
