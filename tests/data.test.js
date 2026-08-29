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

test('shops.json entries have coordinates and google maps link', () => {
  const shops = loadJson('../data/shops.json');
  for (const s of shops) {
    assert.equal(typeof s.lat, 'number');
    assert.equal(typeof s.lng, 'number');
    assert.ok(s.google_maps_url.includes(String(s.lat)));
  }
});
