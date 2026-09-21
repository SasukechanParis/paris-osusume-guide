import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeText, tokenize } from '../js/text-normalize.js';
import { buildPlaces, parseUid, makeUid, applyAliases, fromRecommendations, fromMichelin, annotate, FILTER_GROUPS } from '../js/places.js';
import {
  buildAliasIndex, expandQuery, matchScore, searchPlaces, parseSearchParams, buildSearchParams, DEFAULT_STATE,
  availableFactFilters, attachFacts, indexArticles, searchArticles, hasCriteria
} from '../js/search-core.js';

const load = (path) => JSON.parse(readFileSync(new URL(`../data/${path}.json`, import.meta.url)));
const data = {
  recommendations: load('recommendations'),
  guestRecommendations: load('guest-recommendations'),
  shops: load('shops'),
  michelin: load('michelin'),
  trending: load('trending'),
  fleaMarkets: load('flea-markets'),
  marches: load('marches'),
  freeSpots: load('free-spots'),
  passages: load('passages'),
  toilets: load('toilets')
};
const aliases = load('place-aliases');
const places = buildPlaces(data, aliases);
const aliasIndex = buildAliasIndex(load('search-aliases').groups);
const articles = indexArticles(load('search-articles').articles);
const run = (q, extra = {}, opts = {}) => searchPlaces(places, { ...DEFAULT_STATE, q, ...extra }, { aliasIndex, ...opts });

// ---------- 文字の正規化 ----------
test('normalizeText folds width, case, French accents and katakana/hiragana but keeps dakuten', () => {
  assert.equal(normalizeText('Ｈôtel　ＤＥ　la Paix'), 'hotel de la paix');
  assert.equal(normalizeText('ｶﾞﾚｯﾄ'), 'がれっと');
  assert.equal(normalizeText('ラーメン'), normalizeText('らーめん'));
  assert.notEqual(normalizeText('ば'), normalizeText('は'), '濁点の違いは区別する');
  assert.deepEqual(tokenize('  ラーメン   9区 '), ['らーめん', '9区']);
});

// ---------- ID・重複 ----------
test('every place has a unique dataset-prefixed uid that round-trips', () => {
  const uids = places.map((p) => p.uid);
  assert.equal(new Set(uids).size, uids.length, 'uid collision');
  for (const uid of uids) {
    const parsed = parseUid(uid);
    assert.ok(parsed, uid);
    assert.equal(makeUid(parsed.ds, parsed.id), uid);
  }
  assert.equal(parseUid('x.unknown'), null);
  assert.equal(parseUid('r.UPPER'), null);
});

test('the alias table merges only verified duplicates and keeps separate branches apart', () => {
  const septime = places.filter((p) => p.name === 'Septime');
  assert.equal(septime.length, 1, 'おすすめとミシュランの同一店は1件にまとめる');
  assert.equal(septime[0].uid, 'r.septime');
  assert.equal(septime[0].stars, 1, 'ミシュランの星は統合先に引き継ぐ');
  assert.ok(septime[0].alsoIn.some((a) => a.uid === 'm.septime'));
  for (const uid of ['s.la-parisienne-fbg-poissonniere', 's.la-parisienne-rue-madame', 's.la-parisienne-st-dominique', 's.la-parisienne-coustou']) {
    assert.ok(places.some((p) => p.uid === uid), `${uid} (別支店) は残す`);
  }
  assert.ok(places.some((p) => p.uid === 's.maison-lohezic-courcelles') && places.some((p) => p.uid === 's.maison-lohezic-demours'));
});

test('alias table entries all point at existing places, and no place is both canonical and merged away', () => {
  const all = buildPlaces(data, null).map((p) => p.uid);
  const seen = new Set();
  for (const entry of aliases.same_place) {
    assert.ok(all.includes(entry.canonical), `unknown canonical ${entry.canonical}`);
    assert.ok(entry.basis && entry.basis.length > 5, `${entry.canonical} lacks a basis`);
    for (const uid of entry.also) {
      assert.ok(all.includes(uid), `unknown alias ${uid}`);
      assert.ok(!seen.has(uid), `${uid} merged twice`);
      seen.add(uid);
    }
  }
  for (const entry of aliases.same_place) assert.ok(!seen.has(entry.canonical), `${entry.canonical} is both canonical and merged`);
  for (const group of aliases.keep_separate) for (const uid of group.ids) assert.ok(!seen.has(uid), `${uid} is listed as separate but merged`);
});

test('applyAliases and annotate never mutate their inputs', () => {
  const recs = fromRecommendations(data.recommendations);
  const snapshot = JSON.stringify(recs);
  applyAliases([...recs, ...fromMichelin(data.michelin)], aliases);
  assert.equal(JSON.stringify(recs), snapshot);
  const raw = [{ id: 'a', name: 'A' }];
  assert.equal(annotate(raw, 'rec')[0].uid, 'r.a');
  assert.equal(raw[0].uid, undefined);
});

// ---------- 検索 ----------
test('the same search window finds places by Japanese and by French/English aliases', () => {
  assert.ok(run('ラーメン').some((r) => /ramen|らーめん|ラーメン/i.test(`${r.place.name} ${r.place.description}`)));
  assert.deepEqual(run('ramen').map((r) => r.place.uid), run('ラーメン').map((r) => r.place.uid));
  assert.ok(run('croissant').length > 0);
  assert.equal(run('Hôtel Volney').at(0)?.place.uid, 'g.hotel-volney-opera');
  assert.equal(run('hotel volney').at(0)?.place.uid, 'g.hotel-volney-opera', 'アクセス・大小文字の違いを吸収');
});

test('multi-word queries are AND, and name matches outrank description matches', () => {
  const both = run('septime 11区');
  assert.ok(both.length >= 1 && both.every((r) => /septime/.test(r.place.nameNorm)));
  assert.equal(run('septime 1区xx').length, 0, '一致しない語があれば0件(黙って緩めない)');
  const scores = run('septime');
  assert.equal(scores[0].place.uid, 'r.septime');
  const alts = expandQuery('septime', aliasIndex);
  assert.ok(matchScore(scores[0].place, alts) >= 70);
});

test('「トイレ」 finds public toilets as places and the toilet pages as articles', () => {
  const found = run('トイレ');
  assert.ok(found.length > 100);
  assert.ok(found.every((r) => r.place.category === 'toilet' || /トイレ/.test(r.place.searchText)));
  const hits = searchArticles(articles, expandQuery('トイレ', aliasIndex));
  assert.ok(hits.some((h) => h.article.page === 'toilets-map.html'));
});

test('「免税」 「日曜日」 「チップ」 reach the guide articles with a direct anchor', () => {
  const ids = (q) => searchArticles(articles, expandQuery(q, aliasIndex)).map((h) => h.article.id);
  assert.equal(ids('免税')[0], 'guide.html#detaxe-h');
  assert.ok(ids('日曜日').includes('guide.html#faq-closed'));
  assert.ok(ids('チップ').includes('guide.html#faq-tip'));
  assert.ok(ids('tax free').includes('guide.html#detaxe-h'), '英語の別名でも同じ記事');
});

// ---------- 絞り込み ----------
test('category, source, status, area and 日本食 filters use only fields that exist in the data', () => {
  const japanese = run('', { japanese: true });
  assert.equal(japanese.length, 6);
  assert.ok(japanese.every((r) => r.place.group === 'japanese'));
  const hotelsByGuest = run('', { cats: ['hotel'], sources: ['guest'] });
  assert.ok(hotelsByGuest.length >= 3 && hotelsByGuest.every((r) => r.place.category === 'hotel' && r.place.source === 'guest'));
  const curious9 = run('', { statuses: ['curious'], arr: '9e' });
  assert.ok(curious9.every((r) => r.place.status === 'curious' && r.place.arrondissement === '9e'));
  const michelin = run('', { cats: ['michelin'] });
  assert.ok(michelin.some((r) => r.place.uid === 'r.septime'), '統合された店もミシュランの絞り込みに残る');
});

test('missing facts never match a fact filter (no invented "予約不要" / "安い")', () => {
  assert.deepEqual(availableFactFilters(places), [], '今のデータには条件がないので、フィルターを出さない');
  assert.equal(run('', { facts: { reservation: 'not_needed' } }).length, 0);
  const withFacts = attachFacts(places, { 'r.septime': { reservation: 'required', budget_band: '€€€', indoor: true } });
  const filters = availableFactFilters(withFacts);
  assert.deepEqual(filters.map((f) => f.key), ['budget_band', 'reservation', 'indoor']);
  const hit = searchPlaces(withFacts, { ...DEFAULT_STATE, facts: { reservation: 'required' } }, { aliasIndex });
  assert.deepEqual(hit.map((r) => r.place.uid), ['r.septime']);
});

test('an anchor sorts by straight-line distance, radius limits it, and places without coordinates are skipped', () => {
  const opera = { lat: 48.8721, lng: 2.3323 };
  const near = run('', { cats: ['eat'], radius: 1000, near: 'spot:opera' }, { anchor: opera });
  assert.ok(near.length > 3);
  assert.ok(near.every((r) => r.distanceKm * 1000 <= 1000));
  for (let i = 1; i < near.length; i++) assert.ok(near[i - 1].distanceKm <= near[i].distanceKm);
  assert.ok(near.every((r) => r.place.lat !== null));
});

test('a map bounding box limits results to that area only', () => {
  const box = { south: 48.868, north: 48.875, west: 2.328, east: 2.338 };
  const inBox = run('', { cats: ['eat'] }, { bbox: box });
  assert.ok(inBox.length > 0 && inBox.every((r) => r.place.lat >= box.south && r.place.lat <= box.north && r.place.lng >= box.west && r.place.lng <= box.east));
});

test('hasCriteria is false for the empty search so the start screen is shown, not the whole database', () => {
  assert.equal(hasCriteria(DEFAULT_STATE), false);
  assert.equal(hasCriteria({ ...DEFAULT_STATE, q: 'a' }), true);
  assert.equal(hasCriteria(DEFAULT_STATE, { anchor: { lat: 1, lng: 1 } }), true);
});

test('every filter group covers real categories present in the data', () => {
  const present = new Set(places.flatMap((p) => [p.category, ...p.alsoIn.map((a) => a.category)]));
  for (const group of FILTER_GROUPS) assert.ok(group.categories.some((c) => present.has(c)), group.id);
});

// ---------- URL ----------
test('search state round-trips through the URL, and invalid values are dropped', () => {
  const state = { ...DEFAULT_STATE, q: 'ラーメン', cats: ['eat'], sources: ['sasuke'], statuses: ['recommended'], arr: '2e', japanese: true, near: 'spot:opera', radius: 1000, view: 'map' };
  const params = buildSearchParams(state);
  assert.deepEqual(parseSearchParams(new URLSearchParams(params.toString())), state);
  const dirty = parseSearchParams(new URLSearchParams('cat=eat,bogus&src=hax&st=x&arr=99e&near=spot:nowhere&r=123&view=evil&jp=2&q=' + 'a'.repeat(200)));
  assert.deepEqual(dirty.cats, ['eat']);
  assert.deepEqual(dirty.sources, []);
  assert.equal(dirty.arr, 'all');
  assert.equal(dirty.near, null);
  assert.equal(dirty.radius, null);
  assert.equal(dirty.view, 'list');
  assert.equal(dirty.japanese, false);
  assert.equal(dirty.q.length, 80);
});

test('the URL never carries GPS positions, typed addresses or hotel coordinates', () => {
  for (const near of ['gps', 'address']) {
    const params = buildSearchParams({ ...DEFAULT_STATE, q: 'x', near, radius: 500 });
    assert.equal(params.has('near'), false, near);
    assert.equal(params.has('r'), false, near);
    assert.doesNotMatch(params.toString(), /lat|lng|48\.|2\.3/);
  }
  assert.equal(buildSearchParams({ ...DEFAULT_STATE, near: 'hotel' }).get('near'), 'hotel', '保存ホテルは「使う」という指定だけ(住所は載せない)');
});
