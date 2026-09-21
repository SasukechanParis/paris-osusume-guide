// 端末のデータ・オフライン保存(settings.html)。保存も消去も、押したときだけ。
import { runPage } from './page-init.js';
import { storage } from './storage.js';
import { loadSaved } from './saved.js';
import { loadHotel } from './hotel-anchor.js';
import { loadChecks } from './checklist.js';
import { escapeHtml } from './html.js';
import { track } from './analytics.js';
import { showToast } from './toast.js';
import { supportsOffline, getPackStatus, savePack, deletePack, unregisterServiceWorker } from './offline.js';

const $ = (id) => document.getElementById(id);
const store = storage();

function renderNet() {
  $('net-state').textContent = navigator.onLine ? '現在: 通信できています(オンライン)' : '現在: 通信できていません(オフライン)。保存済みの内容だけ開けます。';
}

async function renderPack() {
  const status = await getPackStatus();
  const el = $('offline-status');
  if (!supportsOffline()) {
    el.innerHTML = '<div class="state-box is-error" role="alert"><p class="state-message">この端末・ブラウザでは、オフライン保存を使えません(古いブラウザ、またはアプリ内ブラウザなど)。Safari・Chromeで開いてください。</p></div>';
    $('offline-save').disabled = true;
    return;
  }
  el.innerHTML = `<p class="offline-line offline-${status.state}">${escapeHtml(status.text)}</p>`;
  $('offline-save').textContent = status.state === 'none' ? 'オフライン用に保存する' : '保存し直す(更新)';
  $('offline-delete').hidden = status.state === 'none';
}

function storedRows() {
  const saved = loadSaved(store).items.length;
  const hotel = loadHotel(store);
  const checks = Object.keys(loadChecks(store).done).length;
  const favs = store.get('french-favs', []);
  return [
    { key: 'saved', label: '保存した場所', value: `${saved}件`, present: saved > 0 },
    { key: 'hotel', label: '宿泊先(ホテル周辺の保存)', value: hotel ? `${hotel.name}(${hotel.savedAt}に保存)` : 'なし', present: Boolean(hotel) },
    { key: 'checklists', label: 'チェックリスト・メモ', value: `${checks}項目にチェック`, present: checks > 0 || Object.keys(store.get('checklists', { memo: {} }).memo ?? {}).length > 0 },
    { key: 'french-favs', label: 'フランス語カードのお気に入り', value: `${Array.isArray(favs) ? favs.length : 0}件`, present: Array.isArray(favs) && favs.length > 0 }
  ];
}

function renderStored() {
  $('stored-list').innerHTML = storedRows()
    .map(
      (row) => `
    <li class="stored-item">
      <div><p class="stored-label">${escapeHtml(row.label)}</p><p class="stored-value">${escapeHtml(row.value)}</p></div>
      <button type="button" class="btn btn-outline" data-clear="${row.key}"${row.present ? '' : ' disabled'}>消す</button>
    </li>`
    )
    .join('');
}

async function onSave() {
  const button = $('offline-save');
  const progress = $('offline-progress');
  button.disabled = true;
  progress.textContent = '保存しています…(通信量: 約1MB弱)';
  const withToilets = loadSaved(store).items.some((i) => i.uid.startsWith('w.'));
  try {
    const result = await savePack({ withToilets, onProgress: (done, total) => (progress.textContent = `保存しています… ${done} / ${total}`) });
    progress.textContent = result.ok
      ? `保存しました(${result.saved}ファイル)。通信が切れても、保存した内容は開けます。`
      : `${result.total}ファイル中${result.saved}ファイルを保存できました。${result.failed.length}ファイルは保存できなかったため、通信状況を確認してもう一度お試しください。`;
    if (result.ok) track('offline', 'save');
    if (!result.metaStored) progress.textContent += ' ただし、保存の記録を残せませんでした(プライベートモードなど)。';
  } catch (err) {
    console.error(err);
    progress.textContent = '保存できませんでした。通信状況と、端末の空き容量を確認して、もう一度お試しください。';
  } finally {
    button.disabled = false;
    await renderPack();
  }
}

let confirmingDelete = false;
async function onDelete() {
  const button = $('offline-delete');
  if (!confirmingDelete) {
    confirmingDelete = true;
    button.textContent = '本当に削除する';
    setTimeout(() => {
      confirmingDelete = false;
      button.textContent = '保存した内容を削除';
    }, 5000);
    return;
  }
  confirmingDelete = false;
  button.textContent = '保存した内容を削除';
  await deletePack();
  $('offline-progress').textContent = 'オフライン用の保存を削除しました。';
  await renderPack();
}

async function onClearAll() {
  const button = $('clear-all');
  if (button.dataset.confirm !== '1') {
    button.dataset.confirm = '1';
    button.textContent = '本当にすべて消す';
    $('clear-status').textContent = '保存した場所・宿泊先・チェック・お気に入り・オフライン保存をすべて消します。もう一度押すと実行します。';
    setTimeout(() => {
      button.dataset.confirm = '';
      button.textContent = 'すべて消す(オフライン保存も含む)';
    }, 6000);
    return;
  }
  for (const name of store.names()) store.remove(name);
  try {
    sessionStorage.clear();
  } catch {
    // 使えなくてもよい
  }
  await deletePack();
  await unregisterServiceWorker();
  button.dataset.confirm = '';
  button.textContent = 'すべて消す(オフライン保存も含む)';
  $('clear-status').textContent = 'すべて消しました。';
  document.dispatchEvent(new CustomEvent('saved:change'));
  renderStored();
  await renderPack();
}

runPage(async () => {
  renderNet();
  window.addEventListener('online', renderNet);
  window.addEventListener('offline', renderNet);
  renderStored();
  await renderPack();
  $('offline-save').addEventListener('click', onSave);
  $('offline-delete').addEventListener('click', onDelete);
  $('clear-all').addEventListener('click', onClearAll);
  $('stored-list').addEventListener('click', (event) => {
    const key = event.target.closest('[data-clear]')?.dataset.clear;
    if (!key) return;
    store.remove(key);
    document.dispatchEvent(new CustomEvent('saved:change'));
    showToast('消しました');
    renderStored();
  });
});
