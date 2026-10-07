import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { GolfBall } from '@/components/GolfBall';
import { colors } from '@/theme';

const BALL = 58;
const JUMP = 64;

/** A golf ball bouncing next to the cup and flag on a strip of turf. */
export function BouncingBall() {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0); // 0 = on the turf, 1 = top of the bounce

  useEffect(() => {
    if (reduceMotion) return;
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 430, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 430, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [t, reduceMotion]);

  const ballStyle = useAnimatedStyle(() => {
    const v = t.get();
    // Squash a little on landing.
    const squash = interpolate(v, [0, 0.12, 1], [0.86, 1, 1]);
    return {
      transform: [
        { translateY: -v * JUMP },
        { rotate: `${v * 160}deg` },
        { scaleX: 2 - squash },
        { scaleY: squash },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 1], [0.28, 0.1]),
    transform: [{ scaleX: interpolate(t.get(), [0, 1], [1, 0.55]) }],
  }));

  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.turf} />
      <View style={styles.cup} />
      <Svg width={46} height={96} viewBox="0 0 46 96" style={styles.flag}>
        <Rect x={3} y={4} width={3} height={90} rx={1.5} fill="#ffffff" />
        <Path d="M6 6 L42 17 L6 29 Z" fill={colors.red} />
      </Svg>
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <Animated.View style={[styles.ball, ballStyle]}>
        <GolfBall size={BALL} style={{ position: 'relative', boxShadow: 'none' }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'center', width: 230, height: 168, marginTop: 6 },
  turf: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    borderRadius: 115,
    backgroundColor: colors.green,
    boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.12)',
  },
  cup: {
    position: 'absolute',
    right: 46,
    bottom: 18,
    width: 40,
    height: 13,
    borderRadius: 20,
    backgroundColor: '#042629',
  },
  flag: { position: 'absolute', right: 41, bottom: 22 },
  shadow: {
    position: 'absolute',
    left: 58,
    bottom: 17,
    width: BALL - 8,
    height: 10,
    borderRadius: 25,
    backgroundColor: '#000',
  },
  ball: { position: 'absolute', left: 54, bottom: 20, width: BALL, height: BALL, transformOrigin: 'center bottom' },
});
