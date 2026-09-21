// 日本語版の全ページで読み込む共通処理(scripts/apply-shell.mjs が各ページに差し込む)。
// ページ固有のJSより先に実行される。

import { installScrollMemory } from './state-restore.js';
import { enhanceCards, refreshClamps, onToggleClick } from './card-actions.js';
import { installSaveButtons, hydrateSaveButtons } from './save-buttons.js';
import { registerServiceWorker, watchForUpdates } from './offline.js';
import { installReportButtons } from './report-buttons.js';
import { track } from './analytics.js';

// オフライン閲覧の土台。登録するだけで、何かを勝手に保存はしない(保存は設定ページで利用者が押したとき)
watchForUpdates();
window.addEventListener('load', () => setTimeout(registerServiceWorker, 1500));

installScrollMemory();
document.addEventListener('click', onToggleClick);
installSaveButtons();
installReportButtons();

// 経路を開いた回数だけを数える(どの店か・どこからかは送らない)
document.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-route]')) track('route');
});

// 文字入力中は下部タブを隠す(キーボードと重なって入力欄が見えなくなるのを防ぐ)
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
function isTypingTarget(el) {
  if (!el || !TYPING_TAGS.has(el.tagName)) return false;
  return !['checkbox', 'radio', 'button', 'submit'].includes(el.type);
}
document.addEventListener('focusin', (event) => {
  if (isTypingTarget(event.target)) document.body.classList.add('is-typing');
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (!isTypingTarget(document.activeElement)) document.body.classList.remove('is-typing');
  }, 50);
});

// 非同期に描画されたカードにも折りたたみを適用する
let scheduled = false;
function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  // rAF は背景タブ・非表示のウェブビューで止まるため、タイマーで束ねる
  setTimeout(() => {
    scheduled = false;
    enhanceCards();
    hydrateSaveButtons();
  }, 30);
}
new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
scheduleEnhance();
document.fonts?.ready.then(() => refreshClamps());
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => refreshClamps(), 200);
});
