import { Pressable, StyleSheet, View } from 'react-native';

import { Eyebrow } from '@/components/Eyebrow';
import { Text } from '@/components/Text';
import { colors, fonts, MAX_PAR, MIN_PAR } from '@/theme';

type Props = {
  pars: number[];
  /** Called with the clamped new par (MIN_PAR..MAX_PAR). */
  onChange: (index: number, par: number) => void;
  onDone?: () => void;
};

/** "Set par for each hole" grid (prototype .par-editor), shared by Setup and onboarding. */
export function ParEditor({ pars, onChange, onDone }: Props) {
  const total = pars.reduce((sum, par) => sum + par, 0);
  const change = (index: number, amount: number) => {
    const next = Math.min(MAX_PAR, Math.max(MIN_PAR, pars[index] + amount));
    if (next !== pars[index]) onChange(index, next);
  };

  return (
    <View style={styles.editor}>
      <View style={styles.heading}>
        <View>
          <Eyebrow style={{ marginBottom: 4, color: '#70916d' }}>COURSE LAYOUT</Eyebrow>
          <Text style={styles.title}>Set par for each hole</Text>
        </View>
        <Text style={styles.total}>Par {total}</Text>
      </View>
      <View style={styles.grid}>
        {pars.map((par, index) => (
          <View key={index} style={styles.control}>
            <Text style={styles.label}>HOLE {index + 1}</Text>
            <View style={styles.row}>
              <Pressable
                accessibilityLabel={`Decrease hole ${index + 1} par`}
                onPress={() => change(index, -1)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>−</Text>
              </Pressable>
              <Text style={styles.value}>{par}</Text>
              <Pressable
                accessibilityLabel={`Increase hole ${index + 1} par`}
                onPress={() => change(index, 1)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {/* Keep the last row's cells the same width as the rows above. */}
        {Array.from({ length: (3 - (pars.length % 3)) % 3 }, (_, i) => (
          <View key={`spacer-${i}`} style={[styles.control, styles.spacer]} />
        ))}
      </View>
      {onDone ? (
        <Pressable style={styles.done} onPress={onDone}>
          <Text style={styles.doneText}>Done editing</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { marginTop: 10, padding: 17, borderRadius: 18, backgroundColor: '#e9f1e5' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 16 },
  total: { color: colors.green, fontSize: 12, fontFamily: fonts.bodyBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  control: {
    flexBasis: '30%',
    flexGrow: 1,
    paddingVertical: 9,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  spacer: { backgroundColor: 'transparent' },
  // Inline label on a 16px parent line box in the prototype, hence the 24px line height.
  label: { textAlign: 'center', color: '#819087', fontSize: 8, lineHeight: 24, fontFamily: fonts.bodyBold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  button: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#eff2ed',
  },
  buttonText: { color: colors.ink, fontSize: 16, lineHeight: 18, fontFamily: fonts.body },
  value: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },
  done: { marginTop: 12, padding: 9, alignItems: 'center', borderRadius: 10, backgroundColor: colors.green },
  doneText: { color: '#fff', fontSize: 10, fontFamily: fonts.bodyBold },
});
