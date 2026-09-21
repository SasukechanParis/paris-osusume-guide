import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlaces, parseUid } from '../js/places.js';
import { buildComparison, toggleCompare, MAX_COMPARE, HOTEL_FACT_FIELDS, COMPARE_DISCLAIMER } from '../js/compare-core.js';
import { attachFacts, FACT_FILTERS, DEFAULT_STATE, searchPlaces, buildAliasIndex, availableFactFilters } from '../js/search-core.js';
import { factsHtml } from '../js/search-cards.js';

const load = (path) => JSON.parse(readFileSync(new URL(`../data/${path}.json`, import.meta.url)));
const data = {
  recommendations: load('recommendations'), guestRecommendations: load('guest-recommendations'), shops: load('shops'),
  michelin: load('michelin'), trending: load('trending'), fleaMarkets: load('flea-markets'), marches: load('marches'),
  freeSpots: load('free-spots'), passages: load('passages'), toilets: load('toilets')
};
const places = buildPlaces(data, load('place-aliases'));
const hotels = places.filter((p) => p.category === 'hotel');
const today = new Date().toISOString().slice(0, 10);

// ---------- ホテル比較 ----------
test('the comparison caps at 3 hotels and stacks by attribute (no wide table)', () => {
  assert.equal(MAX_COMPARE, 3);
  const result = buildComparison(hotels.slice(0, 5));
  assert.equal(result.hotels.length, 3);
  for (const row of result.rows) assert.equal(row.cells.length, 3, row.id);
  assert.deepEqual(toggleCompare(['a', 'b', 'c'], 'd'), { selected: ['a', 'b', 'c'], full: true });
  assert.deepEqual(toggleCompare(['a', 'b'], 'b'), { selected: ['a'], full: false });
});

test('visiting for a shoot (さすけ) and actually staying (先輩カップル) are told apart', () => {
  const sasuke = hotels.find((p) => p.source === 'sasuke');
  const guest = hotels.find((p) => p.source === 'guest');
  const row = buildComparison([sasuke, guest]).rows.find((r) => r.id === 'source');
  assert.match(row.cells[0].text, /撮影で訪れた.*宿泊ではありません/);
  assert.match(row.cells[1].text, /実際に宿泊/);
});

test('with no confirmed facts, no fact rows appear (nothing is invented as あり/なし)', () => {
  const result = buildComparison(hotels.slice(0, 3), {});
  assert.equal(result.hasFacts, false);
  assert.deepEqual(result.rows.map((r) => r.id), ['area', 'source', 'note']);
});

test('confirmed facts show あり/なし with the check date; unknown stays 未確認, and an all-unknown row is hidden', () => {
  const [a, b, c] = hotels;
  const facts = {
    [a.uid]: { prep_space: true, luggage_storage: false, verified_on: '2026-09-01' },
    [b.uid]: { prep_space: false, verified_on: '2026-09-02' }
  };
  const result = buildComparison([a, b, c], facts);
  const prep = result.rows.find((r) => r.id === 'prep_space');
  assert.deepEqual(prep.cells.map((x) => x.text), ['あり(2026-09-01確認)', 'なし(2026-09-02確認)', '未確認']);
  assert.equal(result.rows.find((r) => r.id === 'luggage_storage').cells[1].text, '未確認');
  assert.equal(result.rows.some((r) => r.id === 'elevator'), false, '1軒も確認できていない項目は行ごと出さない');
  assert.match(COMPARE_DISCLAIMER, /宿泊日で変わる価格.*部屋タイプ.*外来/);
});

test('data/hotel-facts.json only holds allowed fields with a date and a source', () => {
  const { facts } = load('hotel-facts');
  const allowed = new Set([...HOTEL_FACT_FIELDS.map((f) => f.key), 'verified_on', 'source', 'note']);
  const uids = new Set(hotels.map((h) => h.uid));
  for (const [uid, entry] of Object.entries(facts)) {
    assert.ok(uids.has(uid), `${uid} is not a hotel`);
    for (const [key, value] of Object.entries(entry)) {
      assert.ok(allowed.has(key), `${uid}: unexpected field ${key}`);
      if (HOTEL_FACT_FIELDS.some((f) => f.key === key)) assert.equal(typeof value, 'boolean', `${uid}.${key}`);
    }
    assert.match(entry.verified_on, /^\d{4}-\d{2}-\d{2}$/, `${uid}: verified_on required`);
    assert.ok(entry.verified_on <= today, `${uid}: verified_on in the future`);
    assert.ok(entry.source?.length > 2, `${uid}: source required`);
  }
});

// ---------- 店舗の確認済み条件(place-facts) ----------
const ALLOWED_FACT_KEYS = new Set(['pick', 'for', 'caution', 'budget', 'reservation', 'indoor', 'sunday_open', 'for_whom', 'price_eur', 'storage', 'bulk', 'verified_on', 'source']);
const ENUMS = {
  reservation: ['required', 'recommended', 'not_needed'],
  for_whom: ['bulk', 'family', 'self'],
  storage: ['ambient', 'chilled'],
  bulk: ['light', 'compact', 'bulky']
};

test('data/place-facts.json: every entry points at a real place and carries a date and a source', () => {
  const { facts } = load('place-facts');
  const uids = new Set(places.flatMap((p) => [p.uid, ...p.alsoIn.map((a) => a.uid)]));
  for (const [uid, entry] of Object.entries(facts)) {
    assert.ok(parseUid(uid) && uids.has(uid), `${uid}: unknown place`);
    for (const key of Object.keys(entry)) assert.ok(ALLOWED_FACT_KEYS.has(key), `${uid}: unexpected field ${key}`);
    for (const [key, values] of Object.entries(ENUMS)) if (key in entry) assert.ok(values.includes(entry[key]), `${uid}.${key}`);
    for (const key of ['indoor', 'sunday_open']) if (key in entry) assert.equal(typeof entry[key], 'boolean');
    for (const key of ['pick', 'for', 'caution']) if (key in entry) assert.ok(entry[key].length <= 120, `${uid}.${key} too long`);
    const hasCondition = Object.keys(entry).some((k) => !['pick', 'for', 'caution', 'verified_on', 'source'].includes(k));
    if (hasCondition) {
      assert.match(entry.verified_on ?? '', /^\d{4}-\d{2}-\d{2}$/, `${uid}: 条件には確認日が必要`);
      assert.ok(entry.verified_on <= today, `${uid}: 確認日が未来`);
      assert.ok(entry.source?.length > 2, `${uid}: 条件には根拠(出典)が必要`);
    }
    if (entry.budget) {
      assert.ok(['€', '€€', '€€€'].includes(entry.budget.band), `${uid}: budget.band`);
      assert.ok(['lunch', 'dinner', 'any'].includes(entry.budget.meal), `${uid}: 食事の区分が必要`);
      assert.ok(['person', 'couple'].includes(entry.budget.per), `${uid}: 1人か2人かが必要`);
      assert.match(entry.budget.verified_on ?? '', /^\d{4}-\d{2}-\d{2}$/, `${uid}: 予算にも確認日`);
      assert.ok(entry.budget.source?.length > 2, `${uid}: 予算にも根拠`);
    }
  }
});

test('budget, reservation and souvenir facts feed the filters, the card and never leak to places without them', () => {
  const uid = 'r.septime';
  const withFacts = attachFacts(places, {
    [uid]: {
      pick: 'ディナーのコース', for: '特別な夜に', caution: '人気店で席が埋まりやすい',
      budget: { band: '€€€', meal: 'dinner', per: 'person', verified_on: '2026-09-01', source: '公式サイト' },
      reservation: 'required', verified_on: '2026-09-01', source: '公式サイト'
    }
  });
  const aliasIndex = buildAliasIndex(load('search-aliases').groups);
  const keys = availableFactFilters(withFacts).map((f) => f.key);
  assert.deepEqual(keys, ['budget_band', 'reservation']);
  assert.deepEqual(searchPlaces(withFacts, { ...DEFAULT_STATE, facts: { budget_band: '€€€' } }, { aliasIndex }).map((r) => r.place.uid), [uid]);
  const html = factsHtml(withFacts.find((p) => p.uid === uid));
  assert.match(html, /予算: €€€\(ディナー・1人あたり・2026-09-01確認\)/);
  assert.match(html, /予約: 必要/);
  assert.match(html, /おすすめ:.*こんな人に:.*注意:/s);
  assert.match(html, /2026-09-01確認・出典: 公式サイト/);
  assert.equal(factsHtml(withFacts.find((p) => p.uid === 'r.frenchie')), '', '条件のない店には何も出さない');
  assert.ok(FACT_FILTERS.some((f) => f.key === 'for_whom') && FACT_FILTERS.some((f) => f.key === 'storage'), 'お土産の条件も持てる');
});
