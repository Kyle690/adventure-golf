import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** 180x70 leaf: CSS `border-radius: 100% 0 100% 0` (elliptical top-left + bottom-right corners). */
function Leaf({ color, style }: { color: string; style: ViewStyle }) {
  return (
    <View style={[styles.leaf, style]}>
      <Svg width={180} height={70} viewBox="0 0 180 70">
        <Path d="M0 70 A180 70 0 0 1 180 0 A180 70 0 0 1 0 70 Z" fill={color} />
      </Svg>
      <View style={styles.vein} />
    </View>
  );
}

/** Decorative tropical leaves behind the dark headers (prototype .leaf-art). */
export function LeafDecoration() {
  return (
    <View pointerEvents="none" style={styles.art}>
      <Leaf color="#176c3c" style={{ top: -8, right: -28, transform: [{ rotate: '-13deg' }] }} />
      <Leaf color="#55a932" style={{ top: 72, right: -90, transform: [{ rotate: '18deg' }] }} />
      <Leaf color="#176c3c" style={{ bottom: -5, left: -91, transform: [{ rotate: '18deg' }, { scale: 1.25 }] }} />
      <Leaf color="#368f35" style={{ bottom: 72, left: -131, transform: [{ rotate: '-7deg' }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  leaf: {
    position: 'absolute',
    width: 180,
    height: 70,
    opacity: 0.55,
    transformOrigin: 'right center',
  },
  vein: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: '92%',
    height: 2,
    backgroundColor: 'rgba(135, 205, 73, 0.25)',
    transform: [{ rotate: '-8deg' }],
  },
});
