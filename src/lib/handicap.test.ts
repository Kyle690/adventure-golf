/// <reference types="node" />
// Run with: npm test   (node:test via tsx)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateHandicap,
  countingDifferentials,
  differentialPerHole,
  effectiveHandicap,
  formatHandicap,
  type HandicapRound,
} from './handicap';

const day = (n: number) => new Date(2026, 0, 1 + n);
/** A 9-hole par-27 round with the given total, played on day n. */
const nine = (strokes: number, n: number): HandicapRound => ({ strokes, par: 27, holes: 9, date: day(n) });

describe('differentialPerHole', () => {
  it('is strokes over par divided by holes', () => {
    assert.equal(differentialPerHole(nine(36, 0)), 1);
    assert.equal(differentialPerHole({ strokes: 50, par: 54, holes: 18, date: day(0) }), -4 / 18);
  });
});

describe('calculateHandicap', () => {
  it('returns null with no rounds', () => {
    assert.equal(calculateHandicap([]), null);
  });

  it('scales the per-hole average to 18 holes and rounds to 1 decimal', () => {
    // 29 strokes on par 27 over 9 holes = 2/9 per hole = 4.0 per 18.
    assert.equal(calculateHandicap([nine(29, 0)]), 4);
    // (2/9 + 5/9) / 2 * 18 = 7.0
    assert.equal(calculateHandicap([nine(29, 0), nine(32, 1)]), 7);
    // 1/9 * 18 = 2.0 ; 1/7 per hole * 18 = 2.571.. -> 2.6
    assert.equal(calculateHandicap([{ strokes: 22, par: 21, holes: 7, date: day(0) }]), 2.6);
  });

  it('uses all rounds when there are fewer than 8', () => {
    const rounds = [30, 31, 32, 33, 34, 35, 36].map((s, i) => nine(s, i));
    // differentials 3..9 strokes over par per 9 holes, mean 6 -> 12.0 per 18
    assert.equal(countingDifferentials(rounds).length, 7);
    assert.equal(calculateHandicap(rounds), 12);
  });

  it('uses the best 8 of the last 20 rounds', () => {
    // 25 rounds: the 5 oldest are brilliant (par) but outside the 20-round window.
    const old = [0, 1, 2, 3, 4].map((n) => nine(27, n));
    // 20 recent rounds: 8 at +2 (29) and 12 at +9 (36).
    const recent = Array.from({ length: 20 }, (_, i) => nine(i % 5 < 2 ? 29 : 36, 10 + i));
    assert.equal(recent.filter((r) => r.strokes === 29).length, 8);
    const diffs = countingDifferentials([...old, ...recent]);
    assert.equal(diffs.length, 8);
    assert.ok(diffs.every((d) => d === 2 / 9));
    assert.equal(calculateHandicap([...old, ...recent]), 4);
  });

  it('ignores input order and rounds without holes', () => {
    const rounds = [nine(29, 3), { strokes: 0, par: 0, holes: 0, date: day(9) }, nine(32, 1)];
    assert.equal(calculateHandicap(rounds), 7);
  });

  it('can be negative for players under par, never -0', () => {
    assert.equal(calculateHandicap([nine(24, 0)]), -6);
    assert.equal(calculateHandicap([nine(27, 0)]), 0);
    assert.ok(!Object.is(calculateHandicap([nine(27, 0)]), -0));
  });
});

describe('formatHandicap', () => {
  it('formats with one decimal and a dash for none', () => {
    assert.equal(formatHandicap(null), '–');
    assert.equal(formatHandicap(4), '4.0');
    assert.equal(formatHandicap(2.6), '2.6');
    assert.equal(formatHandicap(-6), '−6.0');
  });
});

describe('effectiveHandicap', () => {
  it('prefers the calculated value, falls back to the starting handicap', () => {
    assert.deepEqual(effectiveHandicap(3.2, 12), { value: 3.2, source: 'calculated' });
    assert.deepEqual(effectiveHandicap(null, 12), { value: 12, source: 'starting' });
    assert.deepEqual(effectiveHandicap(null, null), { value: null, source: null });
  });
});
