// オフライン保存(ページ側)。利用者が「オフライン用に保存」を押したときだけ、必要なファイルを端末(Cache API)に保存する。
// 保存は pack-<VERSION> に「同じ版のHTML・JS・CSS・JSON」を一式そろえて入れる(古いHTMLと新しいJSが混ざらないように)。
// 保存できたか・いつ・どの版か・どれだけ(件数・容量)を記録して表示し、利用者がいつでも消せる。
// 一度も保存していない内容を、オフラインで使えるとは約束しない。

import { VERSION, loadJson } from './data.js';
import { storage } from './storage.js';

export const PACK_PREFIX = 'pack-';
const META_KEY = 'offline-pack';
const CONCURRENCY = 4;

export const packCacheName = (version = VERSION) => `${PACK_PREFIX}${version}`;

// 保存するURL(サイト内の相対URL)。データは loadJson と同じ ?v= 付きで保存する(オフライン時の要求と一致させる)
export function packUrls(pack, { version = VERSION, withToilets = false } = {}) {
  const data = [...pack.data, ...(withToilets ? pack.optional : [])].map((path) => `${path}?v=${version}`);
  return [...new Set([...pack.pages, ...pack.css, ...pack.js, ...pack.images, ...data])];
}

export const supportsOffline = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';

// 表示用の状態。meta: 保存の記録(なければ null)、exists: 端末に保存が実際に残っているか
export function describePackStatus(meta, { exists = true, currentVersion = VERSION } = {}) {
  if (!meta || !exists) return { state: 'none', text: 'まだ保存していません。保存していない内容は、通信がないと開けません。' };
  const when = new Date(meta.savedAt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });
  const size = meta.bytes >= 1024 * 1024 ? `${(meta.bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(meta.bytes / 1024))}KB`;
  const base = `保存日時: ${when}(${meta.count}ファイル・約${size})`;
  if (meta.partial) return { state: 'partial', text: `${base}。一部を保存できなかったため、もう一度保存してください。` };
  if (meta.version !== currentVersion) return { state: 'stale', text: `${base}。サイトが更新されています。保存内容は古い版です(「保存し直す」で更新)。` };
  return { state: 'current', text: `${base}。最新の版です。` };
}

export async function registerServiceWorker() {
  if (!supportsOffline()) return null;
  try {
    return await navigator.serviceWorker.register('sw.js', { scope: './' });
  } catch (err) {
    console.error(err);
    return null;
  }
}

// サイトが更新されたら知らせる。再読み込みは利用者が押したときだけ(入力途中の内容を失わせない)
export function watchForUpdates() {
  if (!supportsOffline()) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) showUpdateBanner();
  });
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const el = document.createElement('div');
  el.id = 'update-banner';
  el.className = 'update-banner';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<span>サイトが更新されました。入力の途中なら、終わってから再読み込みしてください。</span><button type="button" class="btn" data-update="reload">再読み込み</button><button type="button" class="btn btn-outline" data-update="later">あとで</button>';
  el.addEventListener('click', (event) => {
    const action = event.target.closest('[data-update]')?.dataset.update;
    if (action === 'reload') location.reload();
    if (action === 'later') el.remove();
  });
  document.body.append(el);
}

export function loadMeta(store = storage()) {
  const meta = store.get(META_KEY);
  return meta && typeof meta.version === 'string' && typeof meta.savedAt === 'string' ? meta : null;
}

export async function getPackStatus({ store = storage(), cacheStorage = globalThis.caches } = {}) {
  const meta = loadMeta(store);
  let exists = false;
  if (meta && cacheStorage) {
    try {
      exists = await cacheStorage.has(packCacheName(meta.version));
    } catch {
      exists = false;
    }
  }
  return { meta, exists, ...describePackStatus(meta, { exists }) };
}

async function pool(items, worker, size = CONCURRENCY) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (index < items.length) {
        const current = items[index++];
        await worker(current);
      }
    })
  );
}

// 保存する。戻り値: { ok, saved, total, failed[], bytes }。失敗があれば古い保存は消さない
export async function savePack({
  withToilets = false,
  onProgress = () => {},
  fetchImpl = globalThis.fetch,
  cacheStorage = globalThis.caches,
  store = storage(),
  now = new Date(),
  pack = null
} = {}) {
  const list = pack ?? (await loadJson('data/offline-pack.json'));
  const urls = packUrls(list, { withToilets });
  const cache = await cacheStorage.open(packCacheName());
  const failed = [];
  let bytes = 0;
  let done = 0;
  await pool(urls, async (url) => {
    try {
      const res = await fetchImpl(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bytes += (await res.clone().blob()).size;
      await cache.put(url, res);
    } catch {
      failed.push(url);
    }
    done += 1;
    onProgress(done, urls.length);
  });
  const ok = failed.length === 0;
  if (ok) {
    // 新しい保存がそろってから、古い版の保存を消す(途中で何も残らない状態を作らない)
    for (const name of await cacheStorage.keys()) if (name.startsWith(PACK_PREFIX) && name !== packCacheName()) await cacheStorage.delete(name);
  }
  const meta = { version: VERSION, savedAt: now.toISOString(), count: urls.length - failed.length, bytes, withToilets, partial: !ok, failed: failed.slice(0, 20) };
  const stored = store.set(META_KEY, meta);
  return { ok, saved: urls.length - failed.length, total: urls.length, failed, bytes, metaStored: stored.ok };
}

export async function deletePack({ store = storage(), cacheStorage = globalThis.caches } = {}) {
  if (cacheStorage) for (const name of await cacheStorage.keys()) if (name.startsWith(PACK_PREFIX)) await cacheStorage.delete(name);
  store.remove(META_KEY);
}

export async function unregisterServiceWorker() {
  if (!supportsOffline()) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
}
