import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPack, PACK_PAGES, ROOT } from '../scripts/build-offline-pack.mjs';
import { VERSION } from '../js/data.js';
import { packUrls, describePackStatus, savePack, deletePack, getPackStatus, packCacheName, PACK_PREFIX } from '../js/offline.js';
import { createStorage } from '../js/storage.js';

const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const swSource = read('sw.js');
const pack = JSON.parse(read('data/offline-pack.json'));

// ---------- 整合 ----------
test('sw.js VERSION equals js/data.js VERSION, so a data release also refreshes the service worker', () => {
  assert.equal(swSource.match(/const VERSION = '([^']+)'/)[1], VERSION);
});

test('data/offline-pack.json is up to date (run: node scripts/build-offline-pack.mjs)', () => {
  assert.deepEqual(pack, buildPack());
  assert.equal(`${JSON.stringify(buildPack(), null, 2)}\n`, read('data/offline-pack.json'));
});

test('every file in the pack exists, and every module a saved page imports is in the pack (no half-working offline page)', () => {
  const all = new Set([...pack.pages, ...pack.css, ...pack.js, ...pack.images, ...pack.data]);
  for (const file of all) assert.ok(existsSync(join(ROOT, file)), `${file} is listed but missing`);
  for (const file of pack.js) {
    const dir = posix.dirname(file);
    for (const m of read(file).matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const dep = posix.normalize(posix.join(dir, m[1]));
      assert.ok(pack.js.includes(dep), `${file} imports ${dep}, which is not saved`);
    }
  }
  for (const page of PACK_PAGES) {
    const html = read(page);
    for (const m of html.matchAll(/<script type="module" src="(js\/[^"]+)"/g)) assert.ok(pack.js.includes(m[1]), `${page}: ${m[1]}`);
    for (const m of html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)) assert.ok(pack.css.includes(m[1]), `${page}: ${m[1]}`);
  }
});

test('every JSON the saved pages load through loadJson is in the pack (search, saved list, journey, french, checklists)', () => {
  const wanted = new Set();
  for (const file of pack.js) for (const m of read(file).matchAll(/loadJson\('(data\/[^'?]+)'\)|loadOptional\('(data\/[^'?]+)'/g)) wanted.add(m[1] ?? m[2]);
  wanted.delete('data/offline-pack.json'); // 保存の一覧そのもの。保存するとき(オンライン)にだけ読む
  for (const path of wanted) assert.ok(pack.data.includes(path) || pack.optional.includes(path), `${path} is loaded by a saved page but not in the pack`);
});

test('the pack stays small enough for a phone (the heavy toilets file and original PNGs are not in the default pack)', () => {
  const size = [...pack.pages, ...pack.css, ...pack.js, ...pack.images, ...pack.data].reduce((n, f) => n + readFileSync(join(ROOT, f)).length, 0);
  assert.ok(size < 1.2 * 1024 * 1024, `pack is ${Math.round(size / 1024)}KB`);
  assert.ok(!pack.data.includes('data/toilets.json') && pack.optional.includes('data/toilets.json'));
  assert.ok(pack.images.every((f) => f.endsWith('.webp')));
});

// ---------- Service Worker の範囲 ----------
test('the service worker leaves /en/, other origins, non-GET requests and map tiles alone, and never caches on its own', () => {
  assert.match(swSource, /url\.origin !== self\.location\.origin\) return/);
  assert.match(swSource, /\$\{SCOPE_PATH\}en\//);
  assert.match(swSource, /request\.method !== 'GET'\) return/);
  assert.doesNotMatch(swSource, /openstreetmap|tile\./i, 'OSMタイルを保存する処理はない');
  assert.doesNotMatch(swSource, /cache\.put|cache\.add|addAll/, 'SW自身は保存しない(保存は利用者が押したとき、ページ側だけ)');
  assert.match(swSource, /register|scope/i);
});

test('registration is scoped to the site folder (works under /paris-osusume-guide/ and on a local server)', () => {
  const offline = read('js/offline.js');
  assert.match(offline, /register\('sw\.js', \{ scope: '\.\/' \}\)/);
  assert.ok(existsSync(join(ROOT, 'sw.js')));
});

// ---------- 保存・削除のロジック ----------
function fakeCaches() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const map = stores.get(name);
      return { put: async (url, res) => map.set(url, res), keys: async () => [...map.keys()] };
    },
    has: async (name) => stores.has(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name)
  };
}
const okFetch = async (url) => new Response(`content of ${url}`, { status: 200 });
const memoryStore = () => createStorage(null);
const smallPack = { pages: ['a.html'], css: ['css/a.css'], js: ['js/a.js'], images: [], data: ['data/x.json'], optional: ['data/toilets.json'] };

test('packUrls saves data under the same ?v= URL the pages request, and adds the toilets file only when asked', () => {
  const urls = packUrls(smallPack, { version: '9' });
  assert.ok(urls.includes('data/x.json?v=9') && !urls.includes('data/x.json'));
  assert.ok(!urls.some((u) => u.includes('toilets')));
  assert.ok(packUrls(smallPack, { version: '9', withToilets: true }).includes('data/toilets.json?v=9'));
});

test('savePack stores one consistent pack for this version, reports progress, and records when/what/how much', async () => {
  const cacheStorage = fakeCaches();
  const store = memoryStore();
  const seen = [];
  const result = await savePack({ pack: smallPack, cacheStorage, fetchImpl: okFetch, store, now: new Date('2026-09-21T10:00:00Z'), onProgress: (d, t) => seen.push([d, t]) });
  assert.equal(result.ok, true);
  assert.equal(result.saved, 4);
  assert.deepEqual(seen.at(-1), [4, 4]);
  assert.deepEqual([...cacheStorage.stores.keys()], [packCacheName()]);
  const status = await getPackStatus({ store, cacheStorage });
  assert.equal(status.state, 'current');
  assert.match(status.text, /保存日時:.*4ファイル/);
});

test('an older pack is removed only after the new one is complete; a failed save keeps the old one and says so', async () => {
  const cacheStorage = fakeCaches();
  await cacheStorage.open(`${PACK_PREFIX}old-version`);
  const store = memoryStore();
  const flaky = async (url) => (url.startsWith('data/') ? new Response('nope', { status: 503 }) : okFetch(url));
  const partial = await savePack({ pack: smallPack, cacheStorage, fetchImpl: flaky, store });
  assert.equal(partial.ok, false);
  assert.deepEqual(partial.failed, [`data/x.json?v=${VERSION}`]);
  assert.ok(cacheStorage.stores.has(`${PACK_PREFIX}old-version`), '失敗したときは古い保存を消さない');
  assert.equal((await getPackStatus({ store, cacheStorage })).state, 'partial');
  const full = await savePack({ pack: smallPack, cacheStorage, fetchImpl: okFetch, store });
  assert.equal(full.ok, true);
  assert.ok(!cacheStorage.stores.has(`${PACK_PREFIX}old-version`), '新しい保存がそろったら古い版を消す');
});

test('status is honest: nothing saved, saved-then-cleared-by-the-browser, and a pack from an older site version', async () => {
  const cacheStorage = fakeCaches();
  const store = memoryStore();
  assert.equal((await getPackStatus({ store, cacheStorage })).state, 'none');
  await savePack({ pack: smallPack, cacheStorage, fetchImpl: okFetch, store });
  cacheStorage.stores.clear();
  assert.equal((await getPackStatus({ store, cacheStorage })).state, 'none', 'ブラウザが保存を消していたら「保存済み」と言わない');
  const stale = describePackStatus({ version: 'older', savedAt: '2026-09-01T00:00:00Z', count: 10, bytes: 2048 }, { currentVersion: 'newer' });
  assert.equal(stale.state, 'stale');
  assert.match(stale.text, /古い版/);
});

test('deletePack removes every saved pack and the record', async () => {
  const cacheStorage = fakeCaches();
  const store = memoryStore();
  await savePack({ pack: smallPack, cacheStorage, fetchImpl: okFetch, store });
  await deletePack({ store, cacheStorage });
  assert.equal(cacheStorage.stores.size, 0);
  assert.equal((await getPackStatus({ store, cacheStorage })).state, 'none');
});
