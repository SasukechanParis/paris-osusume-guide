import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortShopsByDistance } from '../js/nearby.js';

const shops = [
  { id: 'far', name: 'Far Shop', lat: 48.9000, lng: 2.4000 },
  { id: 'near', name: 'Near Shop', lat: 48.8566, lng: 2.3525 }
];

test('sortShopsByDistance orders nearest first', () => {
  const result = sortShopsByDistance(shops, 48.8566, 2.3522);
  assert.equal(result[0].shop.id, 'near');
  assert.equal(result[1].shop.id, 'far');
});

test('sortShopsByDistance attaches distanceKm as a number', () => {
  const result = sortShopsByDistance(shops, 48.8566, 2.3522);
  assert.equal(typeof result[0].distanceKm, 'number');
  assert.ok(result[0].distanceKm < result[1].distanceKm);
});
