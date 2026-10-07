import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

/** Progress dots (prototype .hole-dots), driven by the pager position so they morph while swiping. */
function Dot({ index, position, unlocked }: { index: number; position: SharedValue<number>; unlocked: number }) {
  const style = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(position.value - index));
    return {
      width: interpolate(distance, [0, 1], [16, 6]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        ['#8dcf59', index <= unlocked ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.24)'],
      ),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export function StepDots({ count, position, unlocked }: { count: number; position: SharedValue<number>; unlocked: number }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel="Onboarding progress">
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} position={position} unlocked={unlocked} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});
