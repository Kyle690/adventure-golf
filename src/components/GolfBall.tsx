import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

/** Dimpled golf ball (prototype .ball radial/linear gradients). */
export function GolfBall({ size, style }: { size: number; style?: ViewStyle }) {
  const dimple = (cx: number, cy: number, core: number, ring: number) => (
    <>
      <Circle cx={cx * size} cy={cy * size} r={ring * size} fill="#dce2df" />
      <Circle cx={cx * size} cy={cy * size} r={core * size} fill="#fff" />
    </>
  );
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          zIndex: 2,
        },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ball" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="1" stopColor="#ced8d4" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#ball)" />
        {dimple(0.32, 0.26, 0.045, 0.07)}
        {dimple(0.66, 0.36, 0.035, 0.06)}
        {dimple(0.45, 0.65, 0.045, 0.07)}
      </Svg>
    </View>
  );
}
