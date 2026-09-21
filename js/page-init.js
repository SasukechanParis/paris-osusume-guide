// 各ページの初期化を包む。失敗しても画面が操作不能にならず、原因と再試行の導線を出す。

import { showError, showLoading } from './ui-status.js';
import { restoreScroll } from './state-restore.js';
import { focusPlaceFromHash, scrollToHash } from './card-actions.js';

function ensureBanner() {
  let el = document.getElementById('page-status');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'page-status';
  el.className = 'page-status';
  const hero = document.querySelector('.page .hero');
  if (hero) hero.after(el);
  else document.querySelector('.page')?.append(el);
  return el;
}

export async function runPage(init) {
  try {
    await init();
  } catch (err) {
    console.error(err);
    showError(ensureBanner(), err);
  } finally {
    if (!focusPlaceFromHash() && !scrollToHash()) restoreScroll();
  }
}

// 独立したブロックを個別に読み込む(1つ失敗しても他は表示する)。
// 失敗したブロックだけに再試行ボタンを出す。
export async function loadSection(el, task, render, { loadingText } = {}) {
  if (loadingText) showLoading(el, loadingText);
  try {
    const data = await task();
    render(data);
  } catch (err) {
    console.error(err);
    showError(el, err, () => loadSection(el, task, render, { loadingText: '読み込み中…' }));
  }
}
