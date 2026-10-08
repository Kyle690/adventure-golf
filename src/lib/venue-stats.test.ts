/// <reference types="node" />
// Run with: npm test   (node:test via tsx)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sortVenues, summarizeVenue, type CourseAggregate, type RoundTotal, type VenueInput } from './venue-stats';

const pars9 = [3, 3, 4, 3, 2, 4, 3, 3, 4].map((par) => ({ par })); // par 29
const sandton: VenueInput = {
  id: 1,
  name: 'Sandton',
  address: 'Johannesburg',
  image: null,
  courses: [
    { id: 10, name: 'Tropical Trail', image: null, holes: pars9 },
    { id: 11, name: 'Jungle Run', image: null, holes: pars9.slice(0, 6) }, // par 19
  ],
};
const seaside: VenueInput = { id: 2, name: 'Seaside', address: null, image: null, courses: [] };

const aggregates: CourseAggregate[] = [
  { courseId: 10, gamesPlayed: 3, lastPlayed: 1_700_000_000 },
  { courseId: 11, gamesPlayed: 1, lastPlayed: 1_750_000_000 },
];
const totals: RoundTotal[] = [
  { gameId: 1, playerId: 1, courseId: 10, total: 26, par: 29, holes: 9, roundHoles: 9 }, // owner, full round
  { gameId: 1, playerId: 2, courseId: 10, total: 24, par: 29, holes: 9, roundHoles: 9 }, // friend, best overall
  { gameId: 2, playerId: 1, courseId: 10, total: 12, par: 13, holes: 4, roundHoles: 9 }, // partial: ignored
  { gameId: 3, playerId: 1, courseId: 11, total: 21, par: 19, holes: 6, roundHoles: 6 },
];

describe('summarizeVenue', () => {
  const v = summarizeVenue(sandton, aggregates, totals, 1);

  it('counts courses, holes and finished games', () => {
    assert.equal(v.courseCount, 2);
    assert.equal(v.holeCount, 15);
    assert.equal(v.gamesPlayed, 4);
  });

  it('uses the most recent course play as last played', () => {
    assert.equal(v.lastPlayed?.getTime(), 1_750_000_000 * 1000);
  });

  it('computes per-course par and best full-round scores', () => {
    const [trail, jungle] = v.courses;
    assert.equal(trail.par, 29);
    assert.deepEqual([trail.best?.total, trail.best?.playerId, trail.best?.vsPar], [24, 2, -5]);
    assert.deepEqual([trail.ownerBest?.total, trail.ownerBest?.vsPar], [26, -3]);
    assert.deepEqual([jungle.par, jungle.best?.total, jungle.best?.vsPar], [19, 21, 2]);
  });

  it("picks the owner's best across courses (lowest total)", () => {
    assert.equal(v.ownerBest?.total, 21);
    assert.equal(v.ownerBest?.courseName, 'Jungle Run');
  });

  it('handles a venue with no courses or games', () => {
    const empty = summarizeVenue(seaside, aggregates, totals, 1);
    assert.deepEqual(
      [empty.courseCount, empty.holeCount, empty.gamesPlayed, empty.lastPlayed, empty.ownerBest],
      [0, 0, 0, null, null],
    );
  });
});

describe('sortVenues', () => {
  const list = [summarizeVenue(seaside, aggregates, totals, 1), summarizeVenue(sandton, aggregates, totals, 1)];
  it('sorts by name, most played and recently played', () => {
    assert.deepEqual(sortVenues(list, 'name').map((v) => v.name), ['Sandton', 'Seaside']);
    assert.deepEqual(sortVenues(list, 'played').map((v) => v.name), ['Sandton', 'Seaside']);
    assert.deepEqual(sortVenues(list.slice().reverse(), 'recent').map((v) => v.name), ['Sandton', 'Seaside']);
  });
});
