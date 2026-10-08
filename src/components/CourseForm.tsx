import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { FieldCard, FieldLabel, formStyles, ImageField, Stepper, TextField } from '@/components/onboarding/Form';
import { ParEditor } from '@/components/ParEditor';
import { Text } from '@/components/Text';
import type { HoleInput } from '@/db/queries';
import { DIFFICULTY_LEVELS, type Difficulty } from '@/db/schema';
import { pickImageSafely } from '@/lib/images';
import { colors, fonts } from '@/theme';

const DEFAULT_HOLES = 9;
const MIN_HOLES = 1;
const MAX_HOLES = 18;
const DEFAULT_PAR = 3;

const blankHole = (): HoleInput => ({ par: DEFAULT_PAR, length: null, difficulty: null });
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

type CourseInitial = {
  name: string;
  image: string | null;
  holes: { par: number; length: number | null; difficulty: Difficulty | null }[];
} | null | undefined;

/** Form state for a course: name, photo, hole count, par per hole, optional length/difficulty. */
export function useCourseForm(initial: CourseInitial) {
  const [name, setName] = useState(initial?.name ?? '');
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  // `layout` keeps holes removed by lowering the count, so raising it again restores their pars.
  const [layout, setLayout] = useState<HoleInput[]>(() =>
    initial?.holes.length
      ? initial.holes.map((h) => ({ par: h.par, length: h.length, difficulty: h.difficulty }))
      : Array.from({ length: DEFAULT_HOLES }, blankHole),
  );
  const [count, setCountState] = useState(() => (initial?.holes.length ? initial.holes.length : DEFAULT_HOLES));
  const holes = layout.slice(0, count);
  const [showDetails, setShowDetails] = useState(() => holes.some((h) => h.length != null || h.difficulty != null));

  const setCount = (next: number) => {
    setLayout((current) =>
      next > current.length ? [...current, ...Array.from({ length: next - current.length }, blankHole)] : current,
    );
    setCountState(next);
  };
  const updateHole = (index: number, patch: Partial<HoleInput>) =>
    setLayout((current) => current.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  return {
    name,
    setName,
    image,
    setImage,
    holes,
    setCount,
    updateHole,
    showDetails,
    setShowDetails,
    par: holes.reduce((sum, h) => sum + h.par, 0),
    valid: name.trim().length > 0,
    values: () => ({ name: name.trim(), image, holes }),
  };
}
export type CourseFormState = ReturnType<typeof useCourseForm>;

/**
 * Course fields shared by onboarding step 3 and the course edit screen: preview card, name,
 * hole count, photo, the Setup par editor and optional per-hole length/difficulty.
 */
export function CourseFormFields({ form, previewSub = 'Not played yet' }: { form: CourseFormState; previewSub?: string }) {
  const { name, setName, image, setImage, holes, setCount, updateHole, showDetails, setShowDetails, par } = form;
  return (
    <>
        <FieldCard>
          <View style={styles.preview}>
            <View style={styles.icon}>
              {image ? (
                <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Icon name="flag" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{holes.length} HOLE COURSE</Text>
              <Text style={[styles.previewName, !name.trim() && styles.placeholder]} numberOfLines={1}>
                {name.trim() || 'Course name'}
              </Text>
              <Text style={styles.previewSub}>Par {par} · {previewSub}</Text>
            </View>
          </View>
          <TextField
            label="COURSE NAME"
            value={name}
            onChangeText={setName}
            placeholder="e.g. The Tropical Trail"
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={60}
          />
          <View style={styles.holesRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel>NUMBER OF HOLES</FieldLabel>
              <Text style={styles.hint}>Most courses have 9 or 18</Text>
            </View>
            <Stepper label="holes" value={holes.length} min={MIN_HOLES} max={MAX_HOLES} onChange={setCount} />
          </View>
        </FieldCard>

        <View style={{ marginTop: 12 }}>
          <ImageField label="Course photo" uri={image} onPick={() => pickImageSafely(setImage)} onClear={() => setImage(null)} />
        </View>

        <ParEditor pars={holes.map((h) => h.par)} onChange={(index, next) => updateHole(index, { par: next })} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          onPress={() => setShowDetails((v) => !v)}
          style={styles.detailsToggle}
        >
          <View style={styles.detailsIcon}>
            <Icon name={showDetails ? 'close' : 'plus'} size={16} color="#fff" />
          </View>
          <Text style={styles.detailsToggleText}>Hole details</Text>
          <Text style={styles.optional}>LENGTH & DIFFICULTY · OPTIONAL</Text>
        </Pressable>

        {showDetails ? (
          <>
            <View style={{ gap: 8, marginTop: 10 }}>
              {holes.map((hole, index) => (
                <View key={index} style={styles.holeRow}>
                  <View style={styles.holeBadge}>
                    <Text style={styles.holeBadgeLabel}>HOLE</Text>
                    <Text style={styles.holeBadgeNumber}>{index + 1}</Text>
                  </View>
                  <View style={{ width: 62 }}>
                    <FieldLabel>LENGTH</FieldLabel>
                    <View style={styles.lengthRow}>
                      <TextInput
                        accessibilityLabel={`Hole ${index + 1} length in metres`}
                        value={hole.length != null ? String(hole.length) : ''}
                        onChangeText={(text) => {
                          const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
                          updateHole(index, { length: digits ? Number(digits) : null });
                        }}
                        keyboardType="number-pad"
                        placeholder="–"
                        placeholderTextColor="#9aa59f"
                        style={[formStyles.input, styles.lengthInput]}
                      />
                      <Text style={styles.unit}>m</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel>DIFFICULTY</FieldLabel>
                    <View style={styles.chips}>
                      {DIFFICULTY_LEVELS.map((level) => {
                        const selected = hole.difficulty === level;
                        return (
                          <Pressable
                            key={level}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`Hole ${index + 1} ${DIFFICULTY_LABEL[level]}`}
                            onPress={() => updateHole(index, { difficulty: selected ? null : level })}
                            style={[styles.chip, selected && styles.chipSelected]}
                          >
                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                              {DIFFICULTY_LABEL[level]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  icon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.yellow,
  },
  kicker: { color: colors.green, fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  previewName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },
  placeholder: { color: '#b3bdb7' },
  previewSub: { color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  holesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  detailsIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  detailsToggleText: { color: colors.ink, fontSize: 12, fontFamily: fonts.bodyBold },
  optional: { flex: 1, textAlign: 'right', color: '#a6b0aa', fontSize: 8, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  holeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  holeBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#edf4e8',
  },
  holeBadgeLabel: { color: '#7f8e86', fontSize: 7, lineHeight: 9, fontFamily: fonts.bodyBold, letterSpacing: 0.8 },
  holeBadgeNumber: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 20 },
  lengthRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  lengthInput: { flex: 1, paddingVertical: 4, minWidth: 0 },
  unit: { paddingBottom: 5, color: '#8c9992', fontSize: 10, fontFamily: fonts.body },
  chips: { flexDirection: 'row', gap: 5 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff2ed' },
  chipSelected: { backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodySemi },
  chipTextSelected: { color: '#fff' },
});
