import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNominatimResults } from '../js/geocode.js';

test('parseNominatimResults converts Nominatim response to lat/lng/label', () => {
  const raw = [
    { lat: '48.8566', lon: '2.3522', display_name: 'Paris, Île-de-France, France' }
  ];
  const result = parseNominatimResults(raw);
  assert.deepEqual(result, [{ lat: 48.8566, lng: 2.3522, label: 'Paris, Île-de-France, France' }]);
});

test('parseNominatimResults returns empty array for empty response', () => {
  assert.deepEqual(parseNominatimResults([]), []);
});
