import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectionsUrl, buildPlaceSearchUrl } from '../js/maps-links.js';

const shop = { name: 'Hôtel de la Paix', address: '11 Rue Volney, 75002 Paris', lat: 48.8698, lng: 2.3302 };

test('buildDirectionsUrl uses the Google Maps dir endpoint with an encoded name+address destination', () => {
  const url = buildDirectionsUrl(shop);
  assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
  const destination = new URL(url).searchParams.get('destination');
  assert.equal(destination, 'Hôtel de la Paix 11 Rue Volney, 75002 Paris');
  assert.equal(new URL(url).searchParams.has('origin'), false);
});

test('buildDirectionsUrl only passes origin when the user chose one', () => {
  const withSpot = new URL(buildDirectionsUrl(shop, { lat: 48.8721, lng: 2.3323 }));
  assert.equal(withSpot.searchParams.get('origin'), '48.8721,2.3323');
  const withGps = new URL(buildDirectionsUrl(shop, { lat: 48.8721, lng: 2.3323, kind: 'gps' }));
  assert.equal(withGps.searchParams.has('origin'), false, 'GPS位置はURLに埋め込まず、Googleマップ側の現在地に任せる');
});

test('buildDirectionsUrl falls back to coordinates only when name and address are missing', () => {
  const url = new URL(buildDirectionsUrl({ lat: 48.86, lng: 2.34 }));
  assert.equal(url.searchParams.get('destination'), '48.86,2.34');
});

test('buildDirectionsUrl returns null when nothing identifies the destination', () => {
  assert.equal(buildDirectionsUrl({}), null);
});

test('buildPlaceSearchUrl builds the name+address text search url', () => {
  const url = new URL(buildPlaceSearchUrl(shop));
  assert.equal(url.searchParams.get('query'), 'Hôtel de la Paix 11 Rue Volney, 75002 Paris');
});
