import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function loadJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url)));
}

test('contests.json is valid and has required fields', () => {
  const contests = loadJson('../data/contests.json');
  assert.ok(Array.isArray(contests));
  for (const c of contests) {
    assert.ok(c.id && c.name && c.organizer && c.official_url);
  }
});

test('results.json rankings reference known shop ids, or carry a winner_name when the shop is unidentified', () => {
  const results = loadJson('../data/results.json');
  const shops = loadJson('../data/shops.json');
  const shopIds = new Set(shops.map((s) => s.id));
  for (const r of results) {
    assert.ok(r.source_url, `result for ${r.contest_id} ${r.year} missing source_url`);
    for (const ranking of r.rankings) {
      if (ranking.shop_id === null) {
        assert.ok(ranking.winner_name, `ranking with no shop_id must have winner_name (${r.contest_id} ${r.year} rank ${ranking.rank})`);
      } else {
        assert.ok(shopIds.has(ranking.shop_id), `unknown shop_id ${ranking.shop_id}`);
      }
    }
  }
});

function assertPlaceSearchUrl(url, name, address) {
  assert.ok(url.startsWith('https://www.google.com/maps/search/?api=1&query='), `not a maps search url: ${url}`);
  const query = decodeURIComponent(url.split('query=')[1]);
  assert.ok(query.includes(name), `query "${query}" does not include name "${name}"`);
  assert.doesNotMatch(query.trim(), /^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/, `query for ${name} is coordinates only`);
  const postcode = address?.match(/\b(?:75|77|78|91|92|93|94|95)\d{3}\b/)?.[0];
  if (postcode) {
    assert.ok(query.includes(postcode), `query "${query}" does not include postcode "${postcode}"`);
  }
}

test('every shops.json entry has coordinates and a name-and-address Google Maps link', () => {
  const shops = loadJson('../data/shops.json');
  for (const s of shops) {
    assert.equal(typeof s.lat, 'number', `${s.id} has no latitude`);
    assert.equal(typeof s.lng, 'number', `${s.id} has no longitude`);
    assertPlaceSearchUrl(s.google_maps_url, s.name, s.address);
  }
});

test('trending.json entries have coordinates, source, and matching google maps link', () => {
  const trending = loadJson('../data/trending.json');
  assert.ok(Array.isArray(trending));
  for (const t of trending) {
    assert.ok(t.id && t.name && t.source_url, `trending entry missing id/name/source_url: ${JSON.stringify(t)}`);
    assert.equal(typeof t.lat, 'number');
    assert.equal(typeof t.lng, 'number');
    assertPlaceSearchUrl(t.google_maps_url, t.name, t.address);
  }
});

test('recommendations.json entries have valid category/status and matching map link when coordinates are present', () => {
  const recommendations = loadJson('../data/recommendations.json');
  assert.ok(Array.isArray(recommendations));
  const validCategories = new Set(['restaurant', 'chocolatier', 'bakery', 'souvenir', 'supermarket', 'hotel']);
  const validStatuses = new Set(['recommended', 'curious']);
  for (const item of recommendations) {
    assert.ok(item.id && item.name && item.address, `recommendation missing id/name/address: ${JSON.stringify(item)}`);
    assert.ok(validCategories.has(item.category), `unknown category ${item.category} for ${item.id}`);
    assert.ok(validStatuses.has(item.status), `unknown status ${item.status} for ${item.id}`);
    if (item.lat !== null) {
      assert.equal(typeof item.lat, 'number');
      assert.equal(typeof item.lng, 'number');
      assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
    }
  }
});

test('michelin.json entries have valid stars, coordinates, matching map link, and source', () => {
  const michelin = loadJson('../data/michelin.json');
  assert.ok(Array.isArray(michelin));
  for (const item of michelin) {
    assert.ok(item.id && item.name && item.address && item.source_url, `michelin entry missing required field: ${JSON.stringify(item)}`);
    assert.ok([2, 3].includes(item.stars), `unexpected stars value ${item.stars} for ${item.id}`);
    assert.equal(typeof item.lat, 'number');
    assert.equal(typeof item.lng, 'number');
    assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
  }
});

test('flea-markets.json entries have required fields, coordinates, and matching map link', () => {
  const fleaMarkets = loadJson('../data/flea-markets.json');
  assert.ok(Array.isArray(fleaMarkets));
  assert.equal(fleaMarkets.length, 3);
  for (const item of fleaMarkets) {
    assert.ok(
      item.id && item.name && item.address && item.hours && item.access && item.description && item.source_url,
      `flea market entry missing required field: ${JSON.stringify(item)}`
    );
    assert.equal(typeof item.lat, 'number');
    assert.equal(typeof item.lng, 'number');
    assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
  }
});

test('guest-recommendations.json entries have valid category and matching map link when coordinates are present', () => {
  const guestRecommendations = loadJson('../data/guest-recommendations.json');
  assert.ok(Array.isArray(guestRecommendations));
  const validCategories = new Set(['restaurant', 'chocolatier', 'bakery', 'souvenir', 'supermarket', 'hotel']);
  for (const item of guestRecommendations) {
    assert.ok(item.id && item.name && item.address, `guest recommendation missing id/name/address: ${JSON.stringify(item)}`);
    assert.ok(validCategories.has(item.category), `unknown category ${item.category} for ${item.id}`);
    if (item.lat !== null) {
      assert.equal(typeof item.lat, 'number');
      assert.equal(typeof item.lng, 'number');
      assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
    }
  }
});

test('corrected contest winners and the previously unidentified 2024 croissant shop stay linked', () => {
  const results = loadJson('../data/results.json');
  const winnerCases = new Map([
    ['baguette-2026', 'Sithamparappillai Jegatheepan'],
    ['baguette-2021', 'Makram Akrout'],
    ['baguette-2019', 'Fabrice Leroy'],
    ['baguette-2017', 'Sami Bouattour'],
    ['baguette-2014', 'Antonio Teixeira'],
    ['baguette-2013', 'Ridha Khadher'],
    ['baguette-2012', 'Sébastien Mauvieux'],
    ['baguette-2011', 'Pascal Barillon'],
  ]);

  for (const result of results) {
    const expectedWinner = winnerCases.get(`${result.contest_id}-${result.year}`);
    if (expectedWinner) {
      assert.equal(result.rankings.find((ranking) => ranking.rank === 1)?.winner_name, expectedWinner);
    }
  }

  const croissant2024 = results.find((result) => result.contest_id === 'croissant' && result.year === 2024);
  assert.equal(croissant2024.rankings.find((ranking) => ranking.rank === 6)?.shop_id, 'maison-lherault-antony');
});

test('corrected addresses, coordinates, and Michelin descriptions do not regress', () => {
  const shops = new Map(loadJson('../data/shops.json').map((shop) => [shop.id, shop]));
  assert.equal(shops.get('carton-paris').address, '6 boulevard de Denain, 75010 Paris');
  assert.equal(shops.get('boulangerie-frederic-comyn').address, '88 rue Cambronne, 75015 Paris');
  assert.deepEqual(
    [shops.get('freres-blavette').lat, shops.get('freres-blavette').lng],
    [48.833684, 2.33034],
  );
  assert.deepEqual(
    [shops.get('boulangerie-thierry-meunier').lat, shops.get('boulangerie-thierry-meunier').lng],
    [48.8755171, 2.3965926],
  );
  assert.deepEqual(
    [shops.get('julien-saint-honore').lat, shops.get('julien-saint-honore').lng],
    [48.861117, 2.344139],
  );
  assert.equal(shops.get('maison-bergeron').name, 'Maison Bergeron');

  const michelin = new Map(loadJson('../data/michelin.json').map((restaurant) => [restaurant.id, restaurant]));
  assert.match(michelin.get('le-gabriel-reserve').description, /2024年/);
  assert.equal(michelin.get('hakuba').hotel, 'Cheval Blanc Paris');
  assert.equal(michelin.get('labysse-ledoyen').name, "L'Abysse Paris");
});
