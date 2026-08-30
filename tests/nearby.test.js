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

test('sortShopsByDistance excludes shops with unresolved (null) coordinates', () => {
  const withUnresolved = [...shops, { id: 'unresolved', name: 'Unresolved Shop', lat: null, lng: null }];
  const result = sortShopsByDistance(withUnresolved, 48.8566, 2.3522);
  assert.equal(result.length, 2);
  assert.ok(!result.some((r) => r.shop.id === 'unresolved'));
});
