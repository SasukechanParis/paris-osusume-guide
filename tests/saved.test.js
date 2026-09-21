import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyList, normalizeList, add, remove, toggle, setVisited, move, mergeImported, has, buildCanonicalMap,
  loadSaved, persistSaved, MAX_SAVED
} from '../js/saved.js';
import { createStorage } from '../js/storage.js';

const NOW = new Date('2026-09-21T12:00:00Z');
const opts = { now: NOW };

test('add appends in order with the saved date, and never mutates the previous list', () => {
  const list = emptyList();
  const first = add(list, 'r.septime', opts);
  const second = add(first.list, 'g.hotel-volney-opera', opts);
  assert.deepEqual(list, emptyList());
  assert.deepEqual(second.list.items.map((i) => i.uid), ['r.septime', 'g.hotel-volney-opera']);
  assert.equal(second.list.items[0].addedAt, '2026-09-21');
  assert.equal(second.list.items[0].visited, false);
});

test('saving the same place twice (from different pages) does not duplicate it', () => {
  const once = add(emptyList(), 'r.septime', opts).list;
  const again = add(once, 'r.septime', opts);
  assert.equal(again.added, false);
  assert.equal(again.reason, 'duplicate');
  assert.equal(again.list.items.length, 1);
});

test('the Michelin listing and the recommendation of the same restaurant count as one saved place', () => {
  const canonicalMap = buildCanonicalMap({ same_place: [{ canonical: 'r.septime', also: ['m.septime'] }] });
  const saved = add(emptyList(), 'm.septime', { ...opts, canonicalMap }).list;
  assert.deepEqual(saved.items.map((i) => i.uid), ['r.septime'], '統合先のIDで保存する');
  assert.equal(has(saved, 'm.septime', canonicalMap), true);
  assert.equal(add(saved, 'r.septime', { ...opts, canonicalMap }).reason, 'duplicate');
  assert.equal(remove(saved, 'm.septime', canonicalMap).items.length, 0);
});

test('separate branches with the same name are never merged', () => {
  const canonicalMap = buildCanonicalMap({ same_place: [] });
  let list = emptyList();
  for (const uid of ['s.la-parisienne-rue-madame', 's.la-parisienne-coustou']) list = add(list, uid, { ...opts, canonicalMap }).list;
  assert.equal(list.items.length, 2);
});

test('toggle saves then unsaves; invalid ids are refused', () => {
  const saved = toggle(emptyList(), 'r.septime', opts);
  assert.equal(saved.saved, true);
  assert.equal(saved.list.items.length, 1);
  assert.equal(toggle(saved.list, 'r.septime', opts).list.items.length, 0);
  assert.equal(add(emptyList(), 'not-an-id', opts).reason, 'invalid');
  assert.equal(add(emptyList(), 'x.unknown-dataset', opts).reason, 'invalid');
});

test('the list is capped so a share link stays usable', () => {
  let list = emptyList();
  for (let i = 0; i < MAX_SAVED; i++) list = add(list, `r.place-${i}`, opts).list;
  assert.equal(list.items.length, MAX_SAVED);
  const over = add(list, 'r.one-more', opts);
  assert.equal(over.reason, 'full');
  assert.equal(over.list.items.length, MAX_SAVED);
});

test('visited flag and reordering work and preserve the rest', () => {
  let list = emptyList();
  for (const uid of ['r.a', 'r.b', 'r.c']) list = add(list, uid, opts).list;
  list = setVisited(list, 'r.b', true);
  assert.deepEqual(list.items.map((i) => [i.uid, i.visited]), [['r.a', false], ['r.b', true], ['r.c', false]]);
  assert.deepEqual(move(list, 'r.c', -1).items.map((i) => i.uid), ['r.a', 'r.c', 'r.b']);
  assert.equal(move(list, 'r.a', -1), list, '先頭を上へ動かしても何も起きない');
  assert.equal(move(list, 'r.c', 1), list);
  assert.equal(move(list, 'r.zzz', 1), list);
});

test('importing a shared list keeps the existing order, appends only new places, and reports duplicates', () => {
  let mine = emptyList();
  for (const uid of ['r.a', 'r.b']) mine = add(mine, uid, opts).list;
  const result = mergeImported(mine, ['r.b', 'r.c', 'r.d'], opts);
  assert.deepEqual(result.list.items.map((i) => i.uid), ['r.a', 'r.b', 'r.c', 'r.d']);
  assert.equal(result.added, 2);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(mine.items.map((i) => i.uid), ['r.a', 'r.b'], '元のリストは変わらない');
});

test('importing into a nearly full list stops at the cap instead of silently dropping data', () => {
  let list = emptyList();
  for (let i = 0; i < MAX_SAVED - 1; i++) list = add(list, `r.p-${i}`, opts).list;
  const result = mergeImported(list, ['r.x1', 'r.x2', 'r.x3'], opts);
  assert.equal(result.added, 1);
  assert.equal(result.overflow, 2);
});

test('normalizeList repairs corrupted or hostile saved data', () => {
  const dirty = {
    v: 1,
    items: [
      { uid: 'r.ok', addedAt: '2026-01-01', visited: true },
      { uid: 'r.ok', addedAt: '2026-01-02' },
      { uid: '<script>', addedAt: '2026-01-01' },
      { uid: 'zz.bad' },
      null,
      { uid: 'g.fine', addedAt: 'not-a-date', visited: 'yes' }
    ]
  };
  const list = normalizeList(dirty);
  assert.deepEqual(list.items, [
    { uid: 'r.ok', addedAt: '2026-01-01', visited: true },
    { uid: 'g.fine', addedAt: '1970-01-01', visited: false }
  ]);
  assert.deepEqual(normalizeList('garbage'), emptyList());
  assert.deepEqual(normalizeList({ items: 'nope' }), emptyList());
});

test('a saved list survives a reload (persist → load) and reports when the device refuses to store it', () => {
  const store = createStorage(null);
  const list = add(emptyList(), 'r.septime', opts).list;
  assert.equal(persistSaved(store, list).ok, false, 'localStorageが使えない端末ではその旨が分かる');
  assert.deepEqual(loadSaved(store).items.map((i) => i.uid), ['r.septime'], '同じセッション中は使える');

  const backend = new Map();
  const fake = { getItem: (k) => backend.get(k) ?? null, setItem: (k, v) => backend.set(k, v), removeItem: (k) => backend.delete(k), key: () => null, length: 0 };
  const persistent = createStorage(fake);
  assert.equal(persistSaved(persistent, list).ok, true);
  assert.deepEqual(loadSaved(createStorage(fake)).items.map((i) => i.uid), ['r.septime'], '再読み込み後も残る');
});
