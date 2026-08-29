import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceKm, formatDistance } from '../js/distance.js';

test('haversineDistanceKm returns 0 for identical points', () => {
  assert.equal(haversineDistanceKm(48.8566, 2.3522, 48.8566, 2.3522), 0);
});

test('haversineDistanceKm computes known Paris distance within tolerance', () => {
  // Eiffel Tower (48.8584, 2.2945) to Notre-Dame (48.8530, 2.3499) ≈ 4.3km
  const km = haversineDistanceKm(48.8584, 2.2945, 48.8530, 2.3499);
  assert.ok(km > 4.0 && km < 4.6, `expected ~4.3km, got ${km}`);
});

test('formatDistance shows meters under 1km', () => {
  assert.equal(formatDistance(0.65), '650m');
});

test('formatDistance shows km with one decimal at or above 1km', () => {
  assert.equal(formatDistance(1.2), '1.2km');
  assert.equal(formatDistance(12), '12.0km');
});
