import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_SPOTS, findSpot } from '../js/spots.js';

test('main spots have unique ids and Japanese labels', () => {
  const ids = MAIN_SPOTS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const spot of MAIN_SPOTS) {
    assert.match(spot.id, /^[a-z0-9-]+$/);
    assert.ok(spot.label.length > 0);
    assert.ok(spot.fr.length > 0);
  }
});

test('main spots sit inside central Paris (guards against swapped lat/lng or typos)', () => {
  for (const spot of MAIN_SPOTS) {
    assert.ok(spot.lat > 48.84 && spot.lat < 48.9, `${spot.id} lat ${spot.lat}`);
    assert.ok(spot.lng > 2.27 && spot.lng < 2.37, `${spot.id} lng ${spot.lng}`);
  }
});

test('the spots called out in the brief (Opéra, Trocadéro, Louvre) are available', () => {
  for (const id of ['opera', 'trocadero', 'louvre']) assert.ok(findSpot(id), id);
  assert.equal(findSpot('unknown'), null);
});
