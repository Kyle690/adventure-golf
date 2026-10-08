/// <reference types="node" />
/**
 * "Edit players" during a live round (addPlayerToGame / removePlayerFromGame) against a real
 * migrated SQLite: turn order stays 0..n-1, removing a player deletes only their scores in that
 * game, a round keeps at least one player, and finished rounds can't be changed.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scoreGrid } from '../lib/game';
import { MAX_PLAYERS } from '../theme';
import * as q from './queries';
import { freshDatabase, rows } from './test-db';

async function setup() {
  const sqlite = await freshDatabase();
  const owner = q.saveOwner({ name: 'Kyle', avatar: '#ed1b3b', handicap: null });
  const alex = q.addPlayer('Alex', '#f1ba28');
  const jordan = q.addPlayer('Jordan', '#2e9366');
  const venue = q.createVenue({ name: 'Sandton', address: null, image: null });
  const course = q.createCourse(venue.id, {
    name: 'Tropical Trail',
    image: null,
    holes: [3, 4, 2, 3].map((par) => ({ par, length: null, difficulty: null })),
  });
  return { sqlite, owner, alex, jordan, course };
}

const positions = (sqlite: Awaited<ReturnType<typeof setup>>['sqlite'], gameId: number) =>
  rows(sqlite, `SELECT player_id, position FROM game_players WHERE game_id = ${gameId} ORDER BY position`).map(
    (r) => [r.player_id, r.position],
  );

describe('editing players during a round', () => {
  it('adds and removes players mid-game, keeping positions and other scores', async () => {
    const { sqlite, owner, alex, jordan, course } = await setup();

    // A finished round with Alex, to prove removing him later only touches the live round.
    const past = q.startGame(course.id, [owner.id, alex.id]);
    const pastGame = (await q.getGame(past.id))!;
    pastGame.holes.forEach((hole) => {
      q.setScore(past.id, owner.id, hole.id, 3);
      q.setScore(past.id, alex.id, hole.id, 4);
    });
    q.completeGame(past.id);

    const live = q.startGame(course.id, [owner.id, alex.id]);
    const holes = (await q.getGame(live.id))!.holes;
    // Two holes played by both.
    for (const hole of holes.slice(0, 2)) {
      q.setScore(live.id, owner.id, hole.id, 2);
      q.setScore(live.id, alex.id, hole.id, 5);
    }

    // Add an existing player and one created inline; both go to the end of the turn order.
    q.addPlayerToGame(live.id, jordan.id);
    const sam = q.addPlayer('Sam', '#4b87d5');
    q.addPlayerToGame(live.id, sam.id);
    q.addPlayerToGame(live.id, sam.id); // already playing: no-op
    assert.deepEqual(positions(sqlite, live.id), [
      [owner.id, 0],
      [alex.id, 1],
      [jordan.id, 2],
      [sam.id, 3],
    ]);
    let game = (await q.getGame(live.id))!;
    assert.deepEqual(
      game.gamePlayers.map((gp) => gp.player.name),
      ['Kyle', 'Alex', 'Jordan', 'Sam'],
    );
    assert.deepEqual(scoreGrid(game).slice(0, 2), [
      [2, 5, 0, 0],
      [2, 5, 0, 0],
    ]);
    // New players can be scored straight away, including on holes already played.
    q.setScore(live.id, jordan.id, holes[0].id, 3);
    q.setScore(live.id, sam.id, holes[2].id, 4);

    // Remove Alex (has scores): his live-round scores go, everyone else's stay, order closes up.
    const deleted = q.removePlayerFromGame(live.id, alex.id);
    assert.equal(deleted, 2);
    assert.deepEqual(positions(sqlite, live.id), [
      [owner.id, 0],
      [jordan.id, 1],
      [sam.id, 2],
    ]);
    game = (await q.getGame(live.id))!;
    assert.deepEqual(
      game.gamePlayers.map((gp) => gp.player.name),
      ['Kyle', 'Jordan', 'Sam'],
    );
    assert.deepEqual(scoreGrid(game), [
      [2, 3, 0],
      [2, 0, 0],
      [0, 0, 4],
      [0, 0, 0],
    ]);
    assert.equal(rows(sqlite, `SELECT count(*) n FROM scores WHERE game_id = ${live.id} AND player_id = ${alex.id}`)[0].n, 0);
    // Alex is still a saved player, and his finished round is untouched.
    assert.ok(await q.getPlayer(alex.id));
    assert.equal(rows(sqlite, `SELECT sum(strokes) s FROM scores WHERE game_id = ${past.id} AND player_id = ${alex.id}`)[0].s, 16);

    // Removing someone without scores, then re-adding Alex: he goes to the end with no scores.
    assert.equal(q.removePlayerFromGame(live.id, sam.id), 1);
    q.addPlayerToGame(live.id, alex.id);
    assert.deepEqual(positions(sqlite, live.id), [
      [owner.id, 0],
      [jordan.id, 1],
      [alex.id, 2],
    ]);
    assert.deepEqual(scoreGrid((await q.getGame(live.id))!)[0], [2, 3, 0]);

    // At least one player must remain.
    q.removePlayerFromGame(live.id, jordan.id);
    q.removePlayerFromGame(live.id, alex.id);
    assert.throws(() => q.removePlayerFromGame(live.id, owner.id), /at least one player/);
    assert.deepEqual(positions(sqlite, live.id), [[owner.id, 0]]);
    assert.equal(q.removePlayerFromGame(live.id, alex.id), 0, 'removing someone not in the round is a no-op');

    // Finished rounds can't change.
    assert.throws(() => q.addPlayerToGame(past.id, jordan.id), /live round/);
    assert.throws(() => q.removePlayerFromGame(past.id, alex.id), /live round/);
    assert.deepEqual(positions(sqlite, past.id), [
      [owner.id, 0],
      [alex.id, 1],
    ]);

    assert.deepEqual(rows(sqlite, 'PRAGMA foreign_key_check'), []);
  });

  it(`caps a round at ${MAX_PLAYERS} players`, async () => {
    const { owner, course } = await setup();
    const game = q.startGame(course.id, [owner.id]);
    const extra = Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => q.addPlayer(`P${i}`, '#4b87d5'));
    extra.forEach((p) => q.addPlayerToGame(game.id, p.id));
    assert.equal((await q.getGame(game.id))!.gamePlayers.length, MAX_PLAYERS);
    const one = q.addPlayer('One too many', '#ef773f');
    assert.throws(() => q.addPlayerToGame(game.id, one.id), /at most/);
  });
});
