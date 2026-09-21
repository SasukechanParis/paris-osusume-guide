// 保存した場所(saved.html)。一覧・カテゴリ絞り込み・地図・並び替え・「行った」印・共有・取り込み。
// 保存データは端末内だけ。共有リンクは「共有した時点のコピー」で、名前・ホテル・メモ・位置情報を含まない。

import { runPage } from './page-init.js';
import { loadPlaceData } from './places-loader.js';
import { getList, removeSaved, markVisited, moveSaved, importSaved, ensureAliases, getCanonicalMap } from './saved-store.js';
import { canonicalOf } from './saved.js';
import { renderPlaceCard } from './search-cards.js';
import { decodeShare, buildShareUrl, toShareText } from './share.js';
import { FILTER_GROUPS, placeCategories } from './places.js';
import { storage } from './storage.js';
import { createSearchMap } from './search-map.js';
import { showToast } from './toast.js';
import { escapeHtml } from './html.js';
import { track } from './analytics.js';
import { showLoading } from './ui-status.js';

const $ = (id) => document.getElementById(id);
const els = {
  count: $('saved-count'), note: $('storage-note'), importPreview: $('import-preview'), filters: $('saved-filters'),
  results: $('saved-results'), share: $('share-panel'), listView: $('list-view'), mapView: $('map-view'),
  viewList: $('view-list'), viewMap: $('view-map'), mapNotice: $('map-notice'), peek: $('map-peek')
};

let byUid = new Map();
let filter = { cat: 'all', visited: 'all' }; // cat: 'all' | フィルターグループID  visited: 'all' | 'todo' | 'done'
let view = new URLSearchParams(location.search).get('view') === 'map' ? 'map' : 'list';
let mapCtl = null;
let selectedUid = null;
let pendingImport = null;
let shareTexts = { url: '', text: '', tooLong: false };

const resolvePlace = (uid) => byUid.get(canonicalOf(uid, getCanonicalMap())) ?? null;

// 保存済みの項目と、現在のデータの場所を突き合わせる(データから消えた項目は place=null)
function entries() {
  return getList().items.map((item) => ({ item, place: resolvePlace(item.uid) }));
}

function matchesFilter({ item, place }) {
  if (filter.visited === 'todo' && item.visited) return false;
  if (filter.visited === 'done' && !item.visited) return false;
  if (filter.cat === 'all') return true;
  const group = FILTER_GROUPS.find((g) => g.id === filter.cat);
  return Boolean(place && group && placeCategories(place).some((c) => group.categories.includes(c)));
}

// ---------- 描画 ----------
function controlsHtml({ item }, index, total, reorderable) {
  const btn = (action, label, disabled, text) =>
    `<button type="button" class="btn btn-outline saved-move" data-saved-action="${action}" aria-label="${label}"${disabled ? ' disabled' : ''}>${text}</button>`;
  return `
    <label class="visited-check"><input type="checkbox" data-saved-action="visited"${item.visited ? ' checked' : ''}> 行った</label>
    ${btn('up', '一つ上へ', !reorderable || index === 0, '↑')}
    ${btn('down', '一つ下へ', !reorderable || index === total - 1, '↓')}
    <button type="button" class="btn btn-outline" data-saved-action="remove">リストから外す</button>`;
}

function missingCardHtml(item) {
  return `
    <article class="trending-card place-card missing-card" data-uid="${escapeHtml(item.uid)}">
      <p class="trending-name">現在のデータにない項目</p>
      <p class="trending-meta">この場所は、データから削除された可能性があります(ID: ${escapeHtml(item.uid)})。</p>
      <div class="card-actions"><button type="button" class="btn btn-outline" data-saved-action="remove">リストから外す</button></div>
    </article>`;
}

function renderFilters(all) {
  const present = FILTER_GROUPS.filter((g) => all.some((e) => e.place && placeCategories(e.place).some((c) => g.categories.includes(c))));
  const chip = (attr, label, on) => `<button type="button" class="chip${on ? ' is-active' : ''}" ${attr} aria-pressed="${on}">${escapeHtml(label)}</button>`;
  els.filters.innerHTML =
    all.length === 0
      ? ''
      : [
          chip('data-cat="all"', 'すべて', filter.cat === 'all'),
          ...present.map((g) => chip(`data-cat="${g.id}"`, g.label, filter.cat === g.id)),
          chip('data-visited="todo"', 'まだ行っていない', filter.visited === 'todo'),
          chip('data-visited="done"', '行った', filter.visited === 'done')
        ].join('');
}

function render() {
  const all = entries();
  const shown = all.filter(matchesFilter);
  const reorderable = filter.cat === 'all' && filter.visited === 'all';
  els.count.textContent = all.length === 0 ? '' : shown.length === all.length ? `${all.length}件` : `${shown.length}件表示(全${all.length}件)`;
  renderFilters(all);

  if (all.length === 0) {
    els.results.innerHTML = `
      <div class="state-box is-empty" role="status">
        <p class="state-message">まだ保存した場所はありません。「探す」や各ページのカードにある「保存」ボタンで、行きたい場所を集めておけます。</p>
        <a class="btn btn-outline" href="search.html">探す</a>
      </div>`;
  } else if (shown.length === 0) {
    els.results.innerHTML = '<div class="state-box is-empty" role="status">この条件に合う保存済みの場所はありません。「すべて」に戻してください。</div>';
  } else {
    els.results.innerHTML = shown
      .map((entry) => {
        if (!entry.place) return missingCardHtml(entry.item);
        const index = all.indexOf(entry);
        return renderPlaceCard(entry.place, {
          save: false,
          selected: entry.place.uid === selectedUid,
          actionsExtra: controlsHtml(entry, index, all.length, reorderable)
        });
      })
      .join('');
  }
  els.share.hidden = all.length === 0;
  renderShare(all);
  if (view === 'map') renderMap();
}

// ---------- 地図 ----------
async function renderMap() {
  try {
    await mapCtl.ensure();
  } catch (err) {
    console.error(err);
    els.mapNotice.innerHTML =
      '<div class="state-box is-error" role="alert"><p class="state-message">地図を読み込めませんでした(オフライン時は地図を使えません)。一覧では見られます。</p><button type="button" class="btn btn-outline" data-view-go="list">一覧に戻る</button></div>';
    return;
  }
  mapCtl.invalidate();
  const shown = entries().filter((e) => e.place && matchesFilter(e)).map((e) => ({ place: e.place }));
  const info = mapCtl.render(shown, { selectedUid, anchor: null, radius: null, fit: true });
  els.mapNotice.innerHTML = info.total === 0 ? '<div class="state-box is-empty" role="status">地図に出せる保存済みの場所がありません。</div>' : '';
  renderPeek();
}

function renderPeek() {
  const place = selectedUid ? resolvePlace(selectedUid) : null;
  if (!place || view !== 'map') {
    els.peek.hidden = true;
    els.peek.innerHTML = '';
    return;
  }
  els.peek.innerHTML = `<button type="button" class="peek-close" aria-label="選択を閉じる">×</button>${renderPlaceCard(place, { selected: true, save: false })}`;
  els.peek.hidden = false;
}

function applyView() {
  document.body.classList.toggle('search-map-mode', view === 'map');
  els.listView.hidden = view === 'map';
  els.mapView.hidden = view !== 'map';
  els.viewList.setAttribute('aria-pressed', String(view === 'list'));
  els.viewMap.setAttribute('aria-pressed', String(view === 'map'));
}

let listScrollY = 0;
async function setView(next, { push = true } = {}) {
  if (next === view) return;
  if (next === 'map') listScrollY = window.scrollY;
  view = next;
  applyView();
  if (push) history.pushState(null, '', view === 'map' ? `${location.pathname}?view=map` : location.pathname);
  if (view === 'map') await renderMap();
  else {
    renderPeek();
    window.scrollTo(0, listScrollY);
  }
}

// ---------- 共有 ----------
function renderShare(all) {
  const uids = all.map((e) => canonicalOf(e.item.uid, getCanonicalMap()));
  const base = `${location.origin}${location.pathname}`;
  const link = buildShareUrl(base, uids);
  const places = all.map((e) => e.place).filter(Boolean);
  shareTexts = { url: link.url, text: toShareText(places), tooLong: link.tooLong };
  $('share-output').value = link.url;
  $('share-native').hidden = typeof navigator.share !== 'function';
  $('share-note').textContent = link.tooLong
    ? '件数が多いためリンクが長くなり、LINEなどで途中で切れることがあります。「テキストをコピー」または「ファイルに書き出す」をおすすめします。'
    : '';
}

async function copyToClipboard(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMessage);
    return true;
  } catch {
    // Clipboard API が使えない(アプリ内ブラウザ等): 選択できる欄を開いて、手動でコピーしてもらう
    const details = document.querySelector('.share-fallback');
    if (details) details.open = true;
    $('share-output').value = text;
    $('share-output').focus();
    $('share-output').select();
    showToast('自動でコピーできませんでした。開いた欄の文字を選択してコピーしてください。');
    return false;
  }
}

async function onShare(action) {
  if (action === 'native') {
    try {
      await navigator.share({ title: 'パリで行きたい場所', text: `行きたい場所のリスト(${getList().items.length}件)`, url: shareTexts.url });
      track('share', 'native');
    } catch (err) {
      if (err?.name !== 'AbortError') copyToClipboard(shareTexts.url, 'リンクをコピーしました');
    }
    return;
  }
  if (action === 'link') {
    if (await copyToClipboard(shareTexts.url, 'リンクをコピーしました。共有した時点の内容です')) track('share', 'link');
  } else if (action === 'text') {
    if (await copyToClipboard(shareTexts.text, 'テキストをコピーしました')) track('share', 'text');
  } else if (action === 'file') {
    const blob = new Blob([shareTexts.text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'paris-places.txt';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track('share', 'file');
  }
}

// ---------- 取り込み ----------
function checkImport(input) {
  const decoded = decodeShare(input);
  if (!decoded.ok) {
    const reasons = {
      empty: '共有リンクまたは共有コードが見つかりませんでした。',
      version: 'この共有データの形式には対応していません(古いまたは新しい形式です)。',
      format: '共有データの中身を読み取れませんでした。',
      'too-long': '共有データが長すぎるため読み込めません。'
    };
    els.importPreview.hidden = false;
    els.importPreview.innerHTML = `<div class="state-box is-error" role="alert"><p class="state-message">${reasons[decoded.reason]}</p></div>`;
    pendingImport = null;
    return;
  }
  const canonical = getCanonicalMap();
  const saved = new Set(getList().items.map((i) => canonicalOf(i.uid, canonical)));
  const found = [];
  let unknown = 0;
  let already = 0;
  for (const uid of decoded.uids) {
    const place = resolvePlace(uid);
    if (!place) unknown += 1;
    else if (saved.has(place.uid)) already += 1;
    else found.push(place);
  }
  pendingImport = { uids: found.map((p) => p.uid) };
  const list = found.map((p) => `<li>${escapeHtml(p.name)}<span class="filter-note">(${escapeHtml(p.arrondissement ?? '')})</span></li>`).join('');
  els.importPreview.hidden = false;
  els.importPreview.innerHTML = `
    <h2 class="list-title">共有されたリスト(${decoded.uids.length}件)</h2>
    <p class="filter-note">追加できる場所が${found.length}件あります。${already ? `すでに保存済みの${already}件は追加しません。` : ''}${unknown ? `現在のデータにない${unknown}件は取り込めません。` : ''}${decoded.invalid ? `読み取れない${decoded.invalid}件は無視しました。` : ''}</p>
    ${found.length ? `<ol class="import-list">${list}</ol>` : ''}
    <div class="card-actions">
      ${found.length ? '<button type="button" class="btn" data-import="add">保存リストに追加する</button>' : ''}
      <button type="button" class="btn btn-outline" data-import="cancel">取り込まない</button>
    </div>`;
  els.importPreview.scrollIntoView({ block: 'start' });
}

function clearFragment() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

async function onImportAction(action) {
  if (action === 'cancel' || !pendingImport) {
    els.importPreview.hidden = true;
    pendingImport = null;
    clearFragment();
    return;
  }
  const result = await importSaved(pendingImport.uids);
  els.importPreview.hidden = true;
  pendingImport = null;
  clearFragment();
  $('import-input').value = '';
  const tail = !result.persist.ok ? ' ただしこの端末には保存できていません(プライベートモードなど)。' : '';
  showToast(`${result.added}件を保存リストに追加しました${result.overflow ? `(上限のため${result.overflow}件は追加できませんでした)` : ''}。${tail}`);
}

// ---------- 起動 ----------
async function init() {
  showLoading(els.results, '読み込み中…');
  await ensureAliases();
  const withToilets = getList().items.some((i) => i.uid.startsWith('w.'));
  const { places, failedCount } = await loadPlaceData({ withToilets });
  byUid = new Map(places.map((p) => [p.uid, p]));
  if (failedCount > 0) {
    $('page-status').innerHTML = '<div class="state-box is-error" role="alert"><p class="state-message">一部のデータを読み込めなかったため、名前を表示できない項目があるかもしれません。</p><button type="button" class="btn btn-outline state-retry">もう一度読み込む</button></div>';
    document.querySelector('#page-status .state-retry').addEventListener('click', () => location.reload());
  }

  els.note.textContent = storage().persistent
    ? '保存した内容はこの端末のブラウザだけに保存されています(ブラウザのデータを消去すると消えます)。'
    : 'この端末では保存が制限されています(プライベートモードなど)。このページを閉じると消えます。';

  mapCtl = createSearchMap({
    elementId: 'search-map',
    callbacks: {
      onSelect: (uid) => {
        selectedUid = uid;
        renderPeek();
        mapCtl.focus(uid);
      },
      onMovedByUser: () => {}
    }
  });
  bindEvents();
  applyView();
  render();
  if (location.hash.includes('s=')) checkImport(location.hash);
}

// 端末に保存できなかったときは、画面上は変わっていても「消える」ことを正直に伝える
function warnIfNotStored(result, okMessage = '') {
  if (!result.ok) showToast('変更しましたが、この端末には保存できていません(プライベートモードなど)。このページを閉じると元に戻ります。');
  else if (okMessage) showToast(okMessage);
}

function bindEvents() {
  document.addEventListener('saved:change', () => render());
  els.filters.addEventListener('click', (event) => {
    const chip = event.target.closest('button');
    if (!chip) return;
    if (chip.dataset.cat) filter = { ...filter, cat: chip.dataset.cat };
    else if (chip.dataset.visited) filter = { ...filter, visited: filter.visited === chip.dataset.visited ? 'all' : chip.dataset.visited };
    render();
  });
  els.results.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-saved-action]');
    if (!btn || btn.dataset.savedAction === 'visited') return;
    const uid = btn.closest('[data-uid]')?.dataset.uid;
    if (!uid) return;
    const list = getList();
    const stored = list.items.find((i) => canonicalOf(i.uid, getCanonicalMap()) === uid)?.uid ?? uid;
    if (btn.dataset.savedAction === 'remove') {
      warnIfNotStored(removeSaved(stored), 'リストから外しました');
    } else warnIfNotStored(moveSaved(stored, btn.dataset.savedAction === 'up' ? -1 : 1));
  });
  els.results.addEventListener('change', (event) => {
    const box = event.target.closest('[data-saved-action="visited"]');
    if (!box) return;
    const uid = box.closest('[data-uid]').dataset.uid;
    const stored = getList().items.find((i) => canonicalOf(i.uid, getCanonicalMap()) === uid)?.uid ?? uid;
    warnIfNotStored(markVisited(stored, box.checked));
  });
  $('share-native').addEventListener('click', () => onShare('native'));
  $('share-link').addEventListener('click', () => onShare('link'));
  $('share-text').addEventListener('click', () => onShare('text'));
  $('share-file').addEventListener('click', () => onShare('file'));
  $('import-check').addEventListener('click', () => checkImport($('import-input').value));
  els.importPreview.addEventListener('click', (event) => {
    const action = event.target.closest('[data-import]')?.dataset.import;
    if (action) onImportAction(action);
  });
  els.viewList.addEventListener('click', () => setView('list'));
  els.viewMap.addEventListener('click', () => setView('map'));
  els.mapNotice.addEventListener('click', (event) => {
    if (event.target.closest('[data-view-go="list"]')) setView('list');
  });
  els.peek.addEventListener('click', (event) => {
    if (event.target.closest('.peek-close')) {
      selectedUid = null;
      renderPeek();
    }
  });
  window.addEventListener('popstate', () => {
    view = new URLSearchParams(location.search).get('view') === 'map' ? 'map' : 'list';
    applyView();
    if (view === 'map') renderMap();
    else window.scrollTo(0, listScrollY);
  });
  window.addEventListener('hashchange', () => {
    if (location.hash.includes('s=')) checkImport(location.hash);
  });
}

runPage(init);
