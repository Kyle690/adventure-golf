import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { colors } from '@/theme';

const PALETTE = [colors.red, colors.yellow, colors.lime, '#4b87d5', '#ffffff', '#ef773f', '#8dcf59'];
const PIECES = 42;

/** Deterministic pseudo-random in [0, 1) so the layout is stable between renders. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

function Piece({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);
  const left = rand(index) * width;
  const delay = rand(index + 100) * 1800;
  const duration = 2600 + rand(index + 200) * 2200;
  const sway = 10 + rand(index + 300) * 22;
  const spin = (rand(index + 400) > 0.5 ? 1 : -1) * (360 + rand(index + 500) * 540);
  const round = index % 5 === 0;
  const size = 6 + rand(index + 600) * 4;

  useEffect(() => {
    // Two showers, then it settles (ends off-screen).
    progress.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), 2, false)));
  }, [progress, delay, duration]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : 1,
      transform: [
        { translateY: -40 + p * (height + 80) },
        { translateX: Math.sin(p * Math.PI * 4 + index) * sway },
        { rotate: `${p * spin}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left,
          width: size,
          height: round ? size : size * 1.6,
          borderRadius: round ? size / 2 : 2,
          backgroundColor: PALETTE[index % PALETTE.length],
        },
        style,
      ]}
    />
  );
}

/** Falling confetti overlay for the onboarding complete screen (skipped with Reduce Motion). */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  // On web the app is a 470px column; keep pieces inside it.
  const columnWidth = Math.min(width, 470);
  return (
    <View pointerEvents="none" style={styles.layer}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} index={i} width={columnWidth} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', zIndex: 5 },
  piece: { position: 'absolute', top: 0 },
});
