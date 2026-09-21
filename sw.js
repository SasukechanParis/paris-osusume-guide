// Service Worker(オフライン閲覧)。利用者が「オフライン用に保存」を押して保存した内容だけを、通信できないときに返す。
// - 保存していないものは、オフラインで使えるとは約束しない(保存の中身は js/offline.js が pack-<VERSION> に入れる)
// - 外部サービス(地図タイル・Leaflet・フォント・Googleマップ)には触れない。地図はオンライン専用
// - 英語版(/en/)と、同じドメインの別プロジェクトには影響しない(スコープはこのサイトのフォルダ内、/en/ は素通し)
// - 通信できるときは常に最新を取りに行く(更新は自動反映。入力中の画面を勝手に再読み込みしない)
// VERSION は js/data.js と同じ値にする(tests/site-consistency.test.js が検証する)。

const VERSION = '2026-09-21-9';
const PACK_PREFIX = 'pack-';
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const NETWORK_TIMEOUT_MS = 8000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// 保存済みの内容から探す。ページ(navigate)はクエリ違い(?ref=… など)を無視し、フォルダのURLは index.html として探す
async function fromPack(request) {
  const isPage = request.mode === 'navigate';
  const exact = await caches.match(request, { ignoreSearch: isPage });
  if (exact) return exact;
  if (isPage) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) return caches.match(new URL('index.html', url).href, { ignoreSearch: true });
  }
  return undefined;
}

const OFFLINE_PAGE = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>オフラインです</title>
<style>body{font-family:'Hiragino Sans',sans-serif;line-height:1.8;padding:24px;max-width:560px;margin:0 auto}a{display:inline-block;min-height:44px;line-height:44px;margin:4px 8px 4px 0}</style></head>
<body><h1>オフラインです</h1><p>通信できないため、このページは開けません。このページは、この端末に保存されていません。</p>
<p>「オフライン用に保存」で保存した内容(緊急・撮影準備・保存した場所・フランス語カードなど)は、下から開けます。</p>
<p><a href="emergency.html">困ったとき</a><a href="saved.html">保存した場所</a><a href="shoot-day.html">撮影当日</a><a href="french.html">フランス語カード</a><a href="settings.html">端末のデータ・オフライン保存</a></p></body></html>`;

async function handle(request) {
  // 端末が明らかにオフラインなら、待たずに保存済みの内容を返す
  if (self.navigator && self.navigator.onLine === false) {
    const cached = await fromPack(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return new Response(OFFLINE_PAGE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return Response.error();
  }
  try {
    return await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
  } catch (err) {
    const cached = await fromPack(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return new Response(OFFLINE_PAGE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 外部サービスには触れない
  if (!url.pathname.startsWith(SCOPE_PATH)) return; // このサイトの外
  if (url.pathname.startsWith(`${SCOPE_PATH}en/`)) return; // 英語版は対象外
  if (url.pathname.endsWith('/sw.js')) return;
  event.respondWith(handle(request));
});

// 保存の管理(古いバージョンの保存を消す)はページ側(js/offline.js)が Cache API で行う。
// ここでは、どのバージョンの保存でも返せる(保存の内容は必ず同じ VERSION のものが一式そろっている)。
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'version' && event.ports[0]) event.ports[0].postMessage({ version: VERSION, prefix: PACK_PREFIX });
});
