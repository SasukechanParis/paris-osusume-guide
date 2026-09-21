// 全ページ共通の「保存」ボタン(カードの [data-save]) と、下部タブの保存件数バッジ。
// カードは非同期に描画されるため、shell.js の監視から hydrateSaveButtons() が繰り返し呼ばれる。

import { getList, isSaved, toggleSaved, ensureAliases, getCanonicalMap } from './saved-store.js';
import { showToast } from './toast.js';
import { canonicalOf } from './saved.js';
import { track } from './analytics.js';

function cardName(button) {
  return button.closest('.place-card')?.querySelector('.trending-name, .nearby-card-name')?.textContent.trim() ?? 'この場所';
}

function paint(button) {
  const saved = isSaved(button.dataset.save);
  button.setAttribute('aria-pressed', String(saved));
  const name = cardName(button);
  button.setAttribute('aria-label', saved ? `「${name}」の保存を解除` : `「${name}」を保存`);
  const label = button.querySelector('.save-label');
  if (label) label.textContent = saved ? '保存済み' : '保存';
}

export function updateBadge() {
  const count = new Set(getList().items.map((item) => canonicalOf(item.uid, getCanonicalMap()))).size;
  for (const badge of document.querySelectorAll('[data-saved-count]')) {
    badge.hidden = count === 0;
    badge.textContent = String(count);
    badge.parentElement?.setAttribute('aria-label', count ? `保存、${count}件` : '保存');
  }
}

export function hydrateSaveButtons(root = document) {
  for (const button of root.querySelectorAll('[data-save]')) paint(button);
  updateBadge();
}

export function installSaveButtons() {
  ensureAliases().then(() => hydrateSaveButtons());
  document.addEventListener('saved:change', () => hydrateSaveButtons());
  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-save]');
    if (!button) return;
    const name = cardName(button);
    const result = await toggleSaved(button.dataset.save);
    if (result.reason === 'full') showToast('保存できる件数の上限(100件)に達しています。不要なものを外してください。');
    else if (result.reason === 'invalid') showToast('この項目は保存できません。');
    else if (!result.persist.ok) showToast(`「${name}」を${result.saved ? '保存' : '解除'}しました。ただしこの端末には保存できていません(プライベートモードなど)。このページを閉じると消えます。`);
    else {
      showToast(result.saved ? `「${name}」を保存しました` : `「${name}」の保存を解除しました`);
      track('save', result.saved ? 'add' : 'remove');
    }
  });
}
