/// <reference types="node" />
// Run with: npm test   (node:test via tsx)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { rankResults, winnerHeadline, withVerb } from './results';

const pars = [3, 3, 4]; // par 10

describe('rankResults', () => {
  it('ranks by total with vs par, winner first', () => {
    const r = rankResults(pars, [
      { playerId: 1, name: 'Kyle', strokes: [3, 2, 4] },
      { playerId: 2, name: 'Alex', strokes: [4, 3, 5] },
    ]);
    assert.deepEqual(r.map((x) => [x.name, x.total, x.vsPar, x.rank, x.isWinner]), [
      ['Kyle', 9, -1, 1, true],
      ['Alex', 12, 2, 2, false],
    ]);
  });

  it('shares ranks on ties (1, 1, 3) and keeps turn order between ties', () => {
    const r = rankResults(pars, [
      { playerId: 1, name: 'A', strokes: [4, 4, 4] },
      { playerId: 2, name: 'B', strokes: [3, 3, 4] },
      { playerId: 3, name: 'C', strokes: [3, 3, 4] },
    ]);
    assert.deepEqual(r.map((x) => [x.name, x.rank]), [['B', 1], ['C', 1], ['A', 3]]);
    assert.equal(winnerHeadline(r), 'B & C tie!');
  });

  it('counts only scored holes and reports missing ones', () => {
    const r = rankResults(pars, [
      { playerId: 1, name: 'Kyle', strokes: [3, 0, 4] },
      { playerId: 2, name: 'Nobody', strokes: [0, 0, 0] },
    ]);
    assert.deepEqual([r[0].total, r[0].vsPar, r[0].missing], [7, 0, 1]);
    assert.deepEqual([r[1].rank, r[1].isWinner, r[1].missing], [null, false, 3]);
    assert.equal(winnerHeadline(r), 'Kyle wins!');
  });

  it('has no winner without scores', () => {
    assert.equal(winnerHeadline(rankResults(pars, [{ playerId: 1, name: 'K', strokes: [] }])), 'No scores yet');
  });

  it('uses second-person grammar for "You"', () => {
    assert.equal(withVerb('You', 'win'), 'You win');
    assert.equal(withVerb('Alex', 'lead'), 'Alex leads');
  });
});
