import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

export type HoleState = 'done' | 'partial' | 'empty';

const GAP = 6;
/** Room for the corner ticks at both ends. */
const EDGE = 4;
/** Chips share the row when they fit at this width or more; otherwise the row scrolls. */
const MIN_FIT = 30;
const MAX_CHIP = 44;
const SCROLL_CHIP = 34;

/** Every player scored / some did / nobody yet, per hole (from scoreGrid). */
export function holeStates(grid: number[][]): HoleState[] {
  return grid.map((hole) =>
    hole.length > 0 && hole.every((s) => s > 0) ? 'done' : hole.some((s) => s > 0) ? 'partial' : 'empty',
  );
}

/**
 * Row of hole numbers on the game screen: tap any hole to jump to it. Holes everyone has scored
 * are ticked, part-scored ones get a yellow ring, the current hole is filled green.
 * Short courses fill the row; long ones scroll sideways, keeping the current hole in view.
 */
export function HoleStrip({
  numbers,
  states,
  active,
  onSelect,
}: {
  numbers: number[];
  states: HoleState[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const count = numbers.length;
  const shared = count ? (width - EDGE * 2 - GAP * (count - 1)) / count : 0;
  const fits = shared >= MIN_FIT;
  const chip = fits ? Math.min(MAX_CHIP, shared) : SCROLL_CHIP;

  useEffect(() => {
    if (!width || fits) return;
    const x = EDGE + active * (chip + GAP) - (width - chip) / 2;
    scroller.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [active, width, fits, chip]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={!fits}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      contentContainerStyle={styles.row}
      accessibilityLabel="Holes"
    >
      {numbers.map((number, index) => {
        const state = states[index];
        const current = index === active;
        const status = state === 'done' ? 'scored' : state === 'partial' ? 'partly scored' : 'not scored';
        return (
          <Pressable
            key={number}
            accessibilityRole="button"
            accessibilityLabel={`Go to hole ${number}, ${status}`}
            aria-current={current ? 'step' : undefined}
            aria-selected={current}
            onPress={() => onSelect(index)}
            style={[
              styles.chip,
              { width: chip },
              state === 'done' && styles.done,
              state === 'partial' && styles.partial,
              current && styles.current,
            ]}
          >
            <Text style={[styles.number, state === 'done' && { color: colors.green }, current && { color: '#fff' }]}>
              {number}
            </Text>
            {state === 'done' && !current ? (
              <View style={styles.tick}>
                <Icon name="check" size={8} strokeWidth={3.4} color="#fff" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: GAP, paddingTop: 4, paddingBottom: 2, paddingHorizontal: EDGE },
  chip: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e1e6df',
    borderRadius: 11,
    backgroundColor: '#f6f8f4',
  },
  done: { borderColor: '#bfe0ac', backgroundColor: '#e8f4e0' },
  partial: { borderColor: colors.yellow, backgroundColor: '#fffbea' },
  current: { borderColor: colors.green, backgroundColor: colors.green, boxShadow: '0 4px 10px rgba(24, 128, 68, 0.3)' },
  number: { color: '#6f7f77', fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 17 },
  tick: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 7,
    backgroundColor: colors.green,
  },
});
