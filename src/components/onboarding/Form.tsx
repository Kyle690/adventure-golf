import { Image } from 'expo-image';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, fonts, PLAYER_COLORS } from '@/theme';

/** Small uppercase field label (prototype .add-player-form label). */
export function FieldLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {optional ? <Text style={styles.optional}> · OPTIONAL</Text> : null}
    </Text>
  );
}

/** White bordered card holding one or more fields (prototype player-row / venue-card surface). */
export function FieldCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Labelled bottom-border text input, as in the prototype's add-player form. */
export function TextField({
  label,
  optional,
  ...props
}: TextInputProps & { label: string; optional?: boolean }) {
  return (
    <View style={styles.field}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9aa59f"
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

/** Row of player colour swatches (avatars store their colour). */
export function ColorSwatches({
  value,
  onChange,
  taken = [],
}: {
  value: string;
  onChange: (color: string) => void;
  taken?: string[];
}) {
  return (
    <View style={styles.swatches}>
      {PLAYER_COLORS.map((color) => {
        const selected = color === value;
        const used = taken.includes(color) && !selected;
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={`Colour ${color}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(color)}
            style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected, used && styles.swatchUsed]}
          >
            {selected ? <Icon name="check" size={14} strokeWidth={3} color="#fff" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Optional photo slot: dashed "add" tile until a picture is chosen, then a cover preview. */
export function ImageField({
  label,
  uri,
  onPick,
  onClear,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  if (!uri) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPick} style={styles.photoEmpty}>
        <View style={styles.photoIcon}>
          <Icon name="image" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel optional>{label.toUpperCase()}</FieldLabel>
          <Text style={styles.photoHint}>Pick a picture from your photos</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <View style={styles.photo}>
      <Image source={{ uri }} style={styles.photoImage} contentFit="cover" accessibilityLabel={label} />
      <View style={styles.photoActions}>
        <Pressable onPress={onPick} style={styles.photoAction}>
          <Icon name="edit" size={13} color={colors.ink} />
          <Text style={styles.photoActionText}>Change</Text>
        </Pressable>
        <Pressable onPress={onClear} style={styles.photoAction}>
          <Icon name="trash" size={13} color={colors.ink} />
          <Text style={styles.photoActionText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** −  value  + stepper used for the hole count. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel={`Fewer ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.stepButton, value <= min && styles.stepDisabled]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${value} ${label}`}>
        {value}
      </Text>
      <Pressable
        accessibilityLabel={`More ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[styles.stepButton, styles.stepPlus, value >= max && styles.stepDisabled]}
      >
        <Text style={[styles.stepButtonText, { color: '#fff' }]}>+</Text>
      </Pressable>
    </View>
  );
}

/** Small section heading inside the cream body (prototype .section-title h2). */
export function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {aside ? <Text style={styles.sectionAside}>{aside}</Text> : null}
    </View>
  );
}

export const formStyles = StyleSheet.create({
  input: {
    paddingVertical: 7,
    paddingHorizontal: 0,
    color: colors.ink,
    fontSize: 12,
    fontFamily: fonts.body,
    borderBottomWidth: 1,
    borderBottomColor: '#c8d1c6',
    outlineStyle: 'none',
  } as object,
});

const styles = StyleSheet.create({
  label: { marginBottom: 5, color: '#75837b', fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  optional: { color: '#a6b0aa', fontSize: 8, lineHeight: 12, fontFamily: fonts.bodyBold, letterSpacing: 1.2 },
  card: {
    gap: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#dfe4dc',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  field: {},
  input: formStyles.input,
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  swatch: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    boxShadow: '0 0 0 1px #dfe4dc',
  },
  swatchSelected: { boxShadow: `0 0 0 2px ${colors.ink}` },
  swatchUsed: { opacity: 0.35 },
  photoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db09e',
    borderRadius: 15,
    backgroundColor: '#f2f5ed',
  },
  photoIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.green,
  },
  photoHint: { color: '#8c9992', fontSize: 11, fontFamily: fonts.body },
  photo: { overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#dfe4dc', backgroundColor: '#fff' },
  photoImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#e9f1e5' },
  photoActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 9 },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eff2ed',
  },
  photoActionText: { color: colors.ink, fontSize: 10, fontFamily: fonts.bodyBold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#eff2ed',
  },
  stepPlus: { backgroundColor: colors.green },
  stepDisabled: { opacity: 0.4 },
  stepButtonText: { color: colors.ink, fontSize: 20, lineHeight: 22, fontFamily: fonts.body },
  stepValue: { minWidth: 30, textAlign: 'center', color: colors.ink, fontFamily: fonts.displayBold, fontSize: 24 },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  sectionAside: { color: '#82908a', fontSize: 10, fontFamily: fonts.body },
});
