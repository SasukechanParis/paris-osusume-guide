// 外部リンク(Googleマップ)やメニューから「戻った」ときに、スクロール位置とタブ選択を復元する。
// 一覧は非同期に描画されるため、ブラウザ標準の復元では描画前にスクロールが失われる。
// sessionStorage が使えなくても(プライベートモード等)何も壊れない。

const PREFIX = 'paris-osusume-guide:v1:ui:';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function store() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function pageKey(suffix = '') {
  return `${PREFIX}${location.pathname}${location.search}${suffix}`;
}

function write(key, value) {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // 容量不足・禁止時は保存しないだけ
  }
}

function read(key) {
  try {
    const raw = store()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 利用者が自分でスクロール・操作を始めたら、以後は勝手に動かさない
let userMoved = false;
function markUserMoved() {
  userMoved = true;
}

export function saveScroll() {
  // 復元前(まだ触られていない先頭位置)で、保存済みの位置を0で上書きしない
  if (window.scrollY === 0 && !userMoved) return;
  write(pageKey(':scroll'), { y: Math.round(window.scrollY), at: Date.now() });
}

// 何度呼んでも安全(描画前・描画後の両方で呼ぶ)。rAFに依存しない: 背景タブでは rAF が止まるため
export function restoreScroll() {
  if (userMoved) return;
  if (location.hash) return; // アンカー指定を優先
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav && nav.type !== 'back_forward' && nav.type !== 'reload') return;
  const saved = read(pageKey(':scroll'));
  if (!saved || Date.now() - saved.at > MAX_AGE_MS || !(saved.y > 0)) return;
  window.scrollTo(0, saved.y);
}

export function installScrollMemory() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
    window.addEventListener(type, markUserMoved, { passive: true, once: true });
  }
  window.addEventListener('pagehide', saveScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveScroll();
  });
  // iOSでは外部アプリへ移る際に pagehide が来ないことがあるため、リンクを踏む直前にも保存する
  document.addEventListener(
    'click',
    (event) => {
      if (event.target.closest?.('a[href]')) saveScroll();
    },
    { capture: true }
  );
  window.addEventListener('load', () => restoreScroll());
}

export function rememberUi(name, value) {
  write(pageKey(`:${name}`), value);
}

export function recallUi(name) {
  return read(pageKey(`:${name}`));
}
