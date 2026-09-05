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
  const validCategories = new Set(['restaurant', 'chocolatier', 'patisserie', 'bakery', 'souvenir', 'supermarket', 'hotel']);
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

test('michelin.json entries have valid stars/genre, a Google Maps link, and a source; coordinates when resolvable', () => {
  const michelin = loadJson('../data/michelin.json');
  assert.ok(Array.isArray(michelin));
  assert.equal(michelin.length, 127);
  for (const item of michelin) {
    assert.ok(item.id && item.name && item.genre && item.source_url, `michelin entry missing required field: ${JSON.stringify(item)}`);
    assert.ok([1, 2, 3].includes(item.stars), `unexpected stars value ${item.stars} for ${item.id}`);
    assert.ok(item.google_maps_url.startsWith('https://www.google.com/maps/search/?api=1&query='), `bad maps url for ${item.id}`);
    if (item.lat !== null) {
      assert.equal(typeof item.lat, 'number');
      assert.equal(typeof item.lng, 'number');
      if (item.address) assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
    } else {
      assert.equal(item.lng, null, `${item.id} has lat null but lng not null`);
    }
  }
  const byStars = { 1: 0, 2: 0, 3: 0 };
  for (const item of michelin) byStars[item.stars] += 1;
  assert.deepEqual(byStars, { 1: 98, 2: 20, 3: 9 });
});

// Maps a Paris postcode to its arrondissement label. A few arrondissements have a
// historical alternate postcode (used inconsistently across sources for buildings
// near the border of two postal sectors), so those map to the same arrondissement
// as their standard postcode rather than being flagged as a mismatch.
const POSTCODE_TO_ARR = {
  ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => i + 1).map((n) => [`750${String(n).padStart(2, '0')}`, n === 1 ? '1er' : `${n}e`])),
  75116: '16e'
};
const PARIS_LAT_RANGE = [48.75, 49.05];
const PARIS_LNG_RANGE = [2.05, 2.55];
const SUBURB_LABELS = new Set(['Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne']);

function assertParisSanity(items, label) {
  for (const item of items) {
    const arr = item.arrondissement;
    if (item.lat !== null && !SUBURB_LABELS.has(arr)) {
      assert.ok(
        item.lat >= PARIS_LAT_RANGE[0] && item.lat <= PARIS_LAT_RANGE[1] && item.lng >= PARIS_LNG_RANGE[0] && item.lng <= PARIS_LNG_RANGE[1],
        `${label} ${item.id} has coordinates far outside Paris and its inner suburbs: ${item.lat}, ${item.lng}`
      );
    }
    if (item.address && arr && !SUBURB_LABELS.has(arr)) {
      const postcodeMatch = item.address.match(/\b(75\d{3})\b/);
      if (postcodeMatch) {
        const postcode = postcodeMatch[1];
        const expectedArr = POSTCODE_TO_ARR[postcode];
        if (expectedArr) {
          assert.equal(
            arr,
            expectedArr,
            `${label} ${item.id}: arrondissement is "${arr}" but address postcode ${postcode} implies "${expectedArr}" (address: ${item.address})`
          );
        }
      }
    }
  }
}

test('michelin.json entries pass Paris-bounds and arrondissement/postcode sanity checks', () => {
  const michelin = loadJson('../data/michelin.json');
  assertParisSanity(michelin, 'michelin');
});

test('shops.json entries pass Paris-bounds and arrondissement/postcode sanity checks (suburbs allowed via department label)', () => {
  const shops = loadJson('../data/shops.json');
  assertParisSanity(shops, 'shop');
});

test('michelin.json: very short restaurant names (name collision risk) must have a real address on file', () => {
  const michelin = loadJson('../data/michelin.json');
  for (const item of michelin) {
    if (item.name.length <= 3) {
      assert.ok(
        item.address,
        `${item.id} ("${item.name}") is a short, ambiguous name and has no address on file — high risk of resolving to an unrelated same-named place`
      );
    }
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

test('free-spots.json entries have required fields, coordinates, and matching map link', () => {
  const freeSpots = loadJson('../data/free-spots.json');
  assert.ok(Array.isArray(freeSpots));
  assert.equal(freeSpots.length, 6);
  for (const item of freeSpots) {
    assert.ok(
      item.id && item.name && item.address && item.hours && item.access && item.description && item.source_url,
      `free spot entry missing required field: ${JSON.stringify(item)}`
    );
    assert.equal(typeof item.lat, 'number');
    assert.equal(typeof item.lng, 'number');
    assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
  }
});

test('toilets.json entries have required fields, coordinates, a matching map link, and pass Paris-bounds sanity checks', () => {
  const toilets = loadJson('../data/toilets.json');
  assert.ok(Array.isArray(toilets));
  assert.equal(toilets.length, 581);
  const ids = new Set();
  for (const item of toilets) {
    assert.ok(
      item.id && item.name && item.address && item.hours && item.type && item.source_url,
      `toilet entry missing required field: ${JSON.stringify(item)}`
    );
    assert.ok(!ids.has(item.id), `duplicate toilet id ${item.id}`);
    ids.add(item.id);
    assert.equal(typeof item.lat, 'number');
    assert.equal(typeof item.lng, 'number');
    assert.equal(typeof item.pmr_accessible, 'boolean');
    assert.equal(typeof item.baby_changing, 'boolean');
    assertPlaceSearchUrl(item.google_maps_url, item.name, item.address);
  }
  assertParisSanity(toilets, 'toilet');
});

test('updates.json entries have required fields and a valid date format', () => {
  const updates = loadJson('../data/updates.json');
  assert.ok(Array.isArray(updates));
  for (const item of updates) {
    assert.ok(item.id && item.date && item.text, `update entry missing id/date/text: ${JSON.stringify(item)}`);
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/, `update ${item.id} has invalid date "${item.date}"`);
  }
});

test('passages.json entries have required fields, coordinates, a valid tier, and a real Google Maps link', () => {
  const passages = loadJson('../data/passages.json');
  assert.ok(Array.isArray(passages));
  assert.equal(passages.length, 16);
  const validTiers = new Set(['must_visit', 'casual', 'meh']);
  for (const item of passages) {
    assert.ok(
      item.id && item.name && item.address && item.year && item.description,
      `passage entry missing required field: ${JSON.stringify(item)}`
    );
    assert.equal(typeof item.lat, 'number');
    assert.equal(typeof item.lng, 'number');
    assert.ok(validTiers.has(item.tier), `unknown tier ${item.tier} for ${item.id}`);
    assert.match(
      item.google_maps_url,
      /^https:\/\/maps\.app\.goo\.gl\//,
      `passage ${item.id} should link to a verified maps.app.goo.gl place, not a generated search query`
    );
  }
});

test('guest-recommendations.json entries have valid category and matching map link when coordinates are present', () => {
  const guestRecommendations = loadJson('../data/guest-recommendations.json');
  assert.ok(Array.isArray(guestRecommendations));
  const validCategories = new Set(['restaurant', 'chocolatier', 'patisserie', 'bakery', 'souvenir', 'supermarket', 'hotel']);
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
