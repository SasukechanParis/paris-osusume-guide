import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNominatimResults, buildGeocodeUrl } from '../js/geocode.js';

test('parseNominatimResults converts raw Nominatim rows into lat/lng/label objects', () => {
  const raw = [
    { lat: '48.8566', lon: '2.3522', display_name: 'Paris, Île-de-France, France' }
  ];
  const parsed = parseNominatimResults(raw);
  assert.deepEqual(parsed, [{ lat: 48.8566, lng: 2.3522, label: 'Paris, Île-de-France, France' }]);
});

test('parseNominatimResults returns an empty array when nothing matched', () => {
  assert.deepEqual(parseNominatimResults([]), []);
});

test('buildGeocodeUrl keeps the legacy behaviour (limit=1, no country filter) that /en pages rely on', () => {
  const url = new URL(buildGeocodeUrl('Hôtel de la Paix'));
  assert.equal(url.searchParams.get('limit'), '1');
  assert.equal(url.searchParams.has('countrycodes'), false);
  assert.equal(url.searchParams.get('q'), 'Hôtel de la Paix');
});

test('buildGeocodeUrl supports several candidates limited to France for the Japanese site', () => {
  const url = new URL(buildGeocodeUrl('Volney', { limit: 5, countrycodes: 'fr' }));
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('countrycodes'), 'fr');
});

test('buildGeocodeUrl can prefer (not force) an area with viewbox', () => {
  const url = new URL(buildGeocodeUrl('Notre Dame', { viewbox: '1.4,49.3,3.6,48.1' }));
  assert.equal(url.searchParams.get('viewbox'), '1.4,49.3,3.6,48.1');
  assert.equal(url.searchParams.get('bounded'), '0');
});
