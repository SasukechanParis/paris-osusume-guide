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

test('shops.json entries either have coordinates with a matching google maps link, or both are null when unresolved', () => {
  const shops = loadJson('../data/shops.json');
  for (const s of shops) {
    if (s.lat === null) {
      assert.equal(s.lng, null, `${s.id} has lat=null but lng is not null`);
      assert.equal(s.google_maps_url, null, `${s.id} has lat=null but google_maps_url is not null`);
    } else {
      assert.equal(typeof s.lat, 'number');
      assert.equal(typeof s.lng, 'number');
      assert.ok(s.google_maps_url.includes(String(s.lat)));
    }
  }
});

test('trending.json entries have coordinates, source, and matching google maps link', () => {
  const trending = loadJson('../data/trending.json');
  assert.ok(Array.isArray(trending));
  for (const t of trending) {
    assert.ok(t.id && t.name && t.source_url, `trending entry missing id/name/source_url: ${JSON.stringify(t)}`);
    assert.equal(typeof t.lat, 'number');
    assert.equal(typeof t.lng, 'number');
    assert.ok(t.google_maps_url.includes(String(t.lat)));
  }
});

test('recommendations.json entries have valid category/status and matching map link when coordinates are present', () => {
  const recommendations = loadJson('../data/recommendations.json');
  assert.ok(Array.isArray(recommendations));
  const validCategories = new Set(['restaurant', 'chocolatier', 'souvenir']);
  const validStatuses = new Set(['recommended', 'curious']);
  for (const item of recommendations) {
    assert.ok(item.id && item.name && item.address, `recommendation missing id/name/address: ${JSON.stringify(item)}`);
    assert.ok(validCategories.has(item.category), `unknown category ${item.category} for ${item.id}`);
    assert.ok(validStatuses.has(item.status), `unknown status ${item.status} for ${item.id}`);
    if (item.lat !== null) {
      assert.equal(typeof item.lat, 'number');
      assert.equal(typeof item.lng, 'number');
      assert.ok(item.google_maps_url.includes(String(item.lat)));
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
    assert.ok(item.google_maps_url.includes(String(item.lat)));
  }
});
