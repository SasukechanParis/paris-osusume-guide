// 探す(search.html)。店・施設・記事を同じ検索窓で探し、条件で絞り込み、基準地点(現在地・主要地点・ホテル)からの
// 近い順、一覧と地図の切り替えができる。共有してよい条件はURLで再現・「戻る」で復元できる。
// 現在地・住所・ホテルの座標はURLにも保存先(利用者が「宿泊先として保存」を押したときを除く)にも入れない。

import { runPage } from './page-init.js';
import { loadJson } from './data.js';
import { showLoading } from './ui-status.js';
import { buildPlaces, FILTER_GROUPS } from './places.js';
import {
  DEFAULT_STATE, parseSearchParams, buildSearchParams, buildAliasIndex, expandQuery, searchPlaces, searchArticles,
  indexArticles, hasCriteria, attachFacts, availableFactFilters
} from './search-core.js';
import { renderPlaceCard, renderArticleCard } from './search-cards.js';
import { panelSkeleton, syncPanel } from './search-panel.js';
import { createSearchMap } from './search-map.js';
import { MAIN_SPOTS, findSpot } from './spots.js';
import { requestPosition, geoErrorMessage } from './geolocate.js';
import { createGeoSearch, shortLabel } from './geo-search.js';
import { storage } from './storage.js';
import { loadHotel, saveHotel, clearHotel } from './hotel-anchor.js';
import { normalizeText } from './text-normalize.js';
import { escapeHtml } from './html.js';
import { rememberUi, recallUi } from './state-restore.js';
import { arrondissementLabel } from './render.js';
import { createSearchTracker } from './search-metrics.js';

const searchTracker = createSearchTracker();
const PAGE_SIZE = 20;
// 知らないと困る系(免税・トイレ・定休日など)を先に、気が向いたら系(ラーメン・クロワッサンなど)を後ろにする
const KEYWORD_SUGGESTIONS = ['免税', 'トイレ', '日曜日', '日本食', 'ミシュラン', 'お土産', 'ラーメン', 'クロワッサン'];
const TOILET_TERMS = new Set(['トイレ', 'toilet', 'toilets', 'toilettes', 'wc', 'お手洗い', '化粧室', 'sanisette'].map(normalizeText));
const CORE_SOURCES = {
  recommendations: 'data/recommendations.json',
  guestRecommendations: 'data/guest-recommendations.json',
  shops: 'data/shops.json',
  michelin: 'data/michelin.json',
  trending: 'data/trending.json',
  fleaMarkets: 'data/flea-markets.json',
  marches: 'data/marches.json',
  freeSpots: 'data/free-spots.json',
  passages: 'data/passages.json'
};
const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => (i === 0 ? '1er' : `${i + 1}e`));

const $ = (id) => document.getElementById(id);
const els = {
  form: $('search-form'), input: $('search-q'), filterToggle: $('filter-toggle'), filterCount: $('filter-count'),
  panel: $('filter-panel'), viewList: $('view-list'), viewMap: $('view-map'), listView: $('list-view'), mapView: $('map-view'),
  active: $('active-filters'), summary: $('result-summary'), articles: $('articles'), results: $('results'), more: $('more-wrap'),
  searchHere: $('map-search-here'), mapNotice: $('map-notice'), peek: $('map-peek')
};

const store = storage();
let state = parseSearchParams(new URLSearchParams(location.search));
let anchor = null; // { kind: 'gps'|'spot'|'hotel'|'address', lat, lng, label, id? }
let bbox = null; // 地図の範囲(URLには載せない)
let shown = PAGE_SIZE;
let selectedUid = recallUi('selected');
let hotel = loadHotel(store);
let pendingHotel = null; // 住所検索で見つかった、まだ保存していない宿泊先
let places = [];
let results = [];
let aliasIndex = new Map();
let articleIndex = [];
let allData = {};
let placeAliases = null;
let placeFacts = {};
let toilets = 'idle'; // idle | loading | loaded | failed
let listScrollY = 0;
let renderSeq = 0;
let mapCtl = null;
let mapFirstFit = true;

// ---------- データ ----------
async function loadOptional(path, fallback) {
  try {
    return await loadJson(path);
  } catch (err) {
    console.error(err);
    return fallback;
  }
}

async function loadCore() {
  const entries = await Promise.all(
    Object.entries(CORE_SOURCES).map(async ([key, path]) => {
      try {
        return { key, data: await loadJson(path) };
      } catch (err) {
        return { key, error: err };
      }
    })
  );
  const failed = entries.filter((e) => e.error);
  if (failed.length === entries.length) throw failed[0].error; // 通信できていない → ページのエラー表示へ
  return { data: Object.fromEntries(entries.filter((e) => !e.error).map((e) => [e.key, e.data])), failedCount: failed.length };
}

function rebuildPlaces() {
  places = attachFacts(buildPlaces(allData, placeAliases), placeFacts);
}

function needsToilets() {
  if (state.cats.includes('toilet')) return true;
  return expandQuery(state.q, aliasIndex).flat().some((t) => TOILET_TERMS.has(t));
}

async function ensureToilets() {
  if (toilets !== 'idle' || !needsToilets()) return;
  toilets = 'loading';
  els.summary.textContent = 'トイレのデータを読み込んでいます…';
  try {
    allData = { ...allData, toilets: await loadJson('data/toilets.json') };
    rebuildPlaces();
    toilets = 'loaded';
  } catch (err) {
    console.error(err);
    toilets = 'failed';
  }
}

// ---------- 状態 ----------
const anchorCode = (a) => (a.kind === 'spot' ? `spot:${a.id}` : a.kind);
const anchorOrigin = () => (anchor ? { lat: anchor.lat, lng: anchor.lng, kind: anchor.kind } : null);
const anchorText = () => {
  if (!anchor) return '';
  if (anchor.kind === 'gps') return '現在地';
  if (anchor.kind === 'address') return `「${shortLabel(anchor.label)}」付近`;
  return anchor.label;
};

function setState(patch) {
  state = { ...state, ...patch };
  shown = PAGE_SIZE;
}

function setAnchor(next) {
  anchor = next;
  setState({ near: next ? anchorCode(next) : null, radius: next ? state.radius : null });
  render({ fit: true });
}

function applyAnchorFromState() {
  if (state.near?.startsWith('spot:')) {
    const spot = findSpot(state.near.slice(5));
    anchor = spot ? { kind: 'spot', id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.label } : null;
  } else if (state.near === 'hotel') {
    anchor = hotel ? { kind: 'hotel', lat: hotel.lat, lng: hotel.lng, label: hotel.name } : null;
  } else if (state.near !== anchor?.kind) {
    anchor = null; // gps/address はURLから復元しない
  }
  if (!anchor && state.near && !['gps', 'address'].includes(state.near)) state = { ...state, near: null, radius: null };
}

const hasRestrictiveFilters = () =>
  Boolean(state.cats.length || state.sources.length || state.statuses.length || state.arr !== 'all' || state.japanese || Object.keys(state.facts).length || anchor || bbox);

// ---------- 描画 ----------
function activeChips() {
  const chips = [];
  if (state.q) chips.push(['q', `「${state.q}」`]);
  for (const id of state.cats) chips.push([`cat:${id}`, FILTER_GROUPS.find((g) => g.id === id)?.label ?? id]);
  const sourceLabels = { sasuke: 'さすけ', guest: '先輩カップル', reference: '公式・出典つきデータ' };
  for (const id of state.sources) chips.push([`src:${id}`, sourceLabels[id]]);
  const statusLabels = { recommended: 'おすすめ', curious: '気になる(未訪問)' };
  for (const id of state.statuses) chips.push([`st:${id}`, statusLabels[id]]);
  if (state.japanese) chips.push(['jp', '日本食']);
  if (state.arr !== 'all') chips.push(['arr', arrondissementLabel(state.arr)]);
  if (anchor) chips.push(['near', `${anchorText()}から近い順`]);
  if (anchor && state.radius) chips.push(['radius', state.radius >= 1000 ? `${state.radius / 1000}km以内` : `${state.radius}m以内`]);
  if (bbox) chips.push(['bbox', '地図の範囲']);
  for (const [key, value] of Object.entries(state.facts)) chips.push([`fact:${key}`, `${key}: ${value}`]);
  return chips;
}

function startScreenHtml() {
  return `
    <div class="search-start">
      <h2 class="start-title">キーワードで探す</h2>
      <div class="chip-row">${KEYWORD_SUGGESTIONS.map((k) => `<button type="button" class="chip" data-suggest="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('')}</div>
      <h2 class="start-title">カテゴリから探す</h2>
      <div class="chip-row">${FILTER_GROUPS.map((g) => `<button type="button" class="chip" data-quick-cat="${g.id}">${escapeHtml(g.label)}</button>`).join('')}</div>
      <h2 class="start-title">近くから探す</h2>
      <div class="chip-row">
        <button type="button" class="chip" data-quick-anchor="gps">現在地から</button>
        ${MAIN_SPOTS.slice(0, 6).map((s) => `<button type="button" class="chip" data-quick-spot="${s.id}">${escapeHtml(s.label)}</button>`).join('')}
      </div>
      <p class="filter-note">「条件を絞る」から、ホテル名・住所の近く、エリア、推薦元でも探せます。</p>
    </div>`;
}

function renderList() {
  const criteria = hasCriteria(state, { anchor, bbox });
  const chips = activeChips();
  els.active.innerHTML =
    chips.length > 0
      ? chips.map(([key, label]) => `<button type="button" class="chip is-active" data-remove="${key}" aria-label="${escapeHtml(label)}の条件を外す">${escapeHtml(label)} ×</button>`).join('') +
        (chips.length > 1 ? '<button type="button" class="chip" data-remove="all">すべて解除</button>' : '')
      : '';

  const factCount = chips.filter(([k]) => k !== 'q').length;
  els.filterCount.hidden = factCount === 0;
  els.filterCount.textContent = factCount ? `(${factCount})` : '';

  if (!criteria) {
    els.summary.textContent = '';
    els.articles.innerHTML = '';
    els.results.innerHTML = startScreenHtml();
    els.more.innerHTML = '';
    return;
  }

  const hits = state.q && !hasRestrictiveFilters() ? searchArticles(articleIndex, expandQuery(state.q, aliasIndex)).slice(0, 5) : [];
  els.articles.innerHTML = hits.length
    ? `<h2 class="list-title">記事・ガイド(${hits.length}件)</h2>${hits.map((h) => renderArticleCard(h.article)).join('')}`
    : '';

  const parts = [`場所 ${results.length}件`];
  if (anchor) parts.push(`${anchorText()}から近い順(直線距離)`);
  if (bbox) parts.push('地図の範囲内');
  if (toilets === 'failed' && needsToilets()) parts.push('※トイレのデータを読み込めませんでした');
  els.summary.textContent = parts.join(' ・ ');

  const visible = results.slice(0, shown);
  if (visible.length === 0) {
    els.results.innerHTML = `<div class="state-box is-empty" role="status"><p class="state-message">条件に合う場所は見つかりませんでした。${chips.length > 1 ? '上の条件を1つずつ外すと見つかるかもしれません。' : '表記を変えて試してください(例: カタカナ・英語)。'}</p></div>`;
  } else {
    els.results.innerHTML = visible
      .map((r) => renderPlaceCard(r.place, { distanceKm: r.distanceKm, origin: anchorOrigin(), selected: r.place.uid === selectedUid }))
      .join('');
  }
  const rest = results.length - visible.length;
  els.more.innerHTML = rest > 0 ? `<button type="button" class="btn btn-outline nearby-more-btn">もっと見る(あと${rest}件)</button>` : '';
}

function renderPeek() {
  const hit = results.find((r) => r.place.uid === selectedUid);
  if (!hit || state.view !== 'map') {
    els.peek.hidden = true;
    els.peek.innerHTML = '';
    return;
  }
  els.peek.innerHTML = `<button type="button" class="peek-close" aria-label="選択を閉じる">×</button>${renderPlaceCard(hit.place, { distanceKm: hit.distanceKm, origin: anchorOrigin(), selected: true })}`;
  els.peek.hidden = false;
}

async function renderMap({ fit }) {
  try {
    await mapCtl.ensure();
  } catch (err) {
    console.error(err);
    els.mapNotice.innerHTML = `<div class="state-box is-error" role="alert"><p class="state-message">地図を読み込めませんでした。電波の良い場所でもう一度お試しください(オフライン時は地図を使えません)。一覧では探せます。</p><div class="card-actions"><button type="button" class="btn btn-outline" data-view-go="list">一覧に戻る</button><button type="button" class="btn btn-outline" data-view-go="retry-map">もう一度試す</button></div></div>`;
    return;
  }
  mapCtl.invalidate();
  const info = mapCtl.render(results, { selectedUid, anchor, radius: state.radius, fit: fit || mapFirstFit });
  mapFirstFit = false;
  els.searchHere.hidden = true;
  els.mapNotice.innerHTML =
    info.total === 0
      ? '<div class="state-box is-empty" role="status">この条件では地図に出せる場所がありません。条件を変えるか、一覧をご覧ください。</div>'
      : info.total > info.shown
        ? `<div class="state-box is-empty" role="status">${info.total}件のうち先頭${info.shown}件を地図に表示しています。条件を絞るか「この範囲で探す」を使ってください。</div>`
        : '';
  renderPeek();
}

function syncUrl({ push = false } = {}) {
  const qs = buildSearchParams(state).toString();
  const url = qs ? `${location.pathname}?${qs}` : location.pathname;
  if (url === location.pathname + location.search) return;
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}

async function render({ fit = false } = {}) {
  const mine = ++renderSeq;
  await ensureToilets();
  if (mine !== renderSeq) return;
  const criteria = hasCriteria(state, { anchor, bbox });
  results = criteria ? searchPlaces(places, state, { aliasIndex, anchor, bbox }) : [];
  renderList();
  // 検索の利用状況(検索語・住所・現在地は送らない。signature はこの端末内で「直前と同じ条件か」を見るだけ)
  searchTracker.note(`${buildSearchParams(state)}|${anchor ? 'a' : ''}${bbox ? 'b' : ''}`, {
    hasQuery: Boolean(state.q),
    hasFilters: activeChips().some(([key]) => key !== 'q'),
    count: results.length
  });
  syncPanel(els.panel, { state, anchor, hotel });
  if (document.activeElement !== els.input) els.input.value = state.q;
  syncUrl();
  if (state.view === 'map') await renderMap({ fit });
}

// ---------- 一覧 ⇔ 地図 ----------
function applyViewToDom() {
  const isMap = state.view === 'map';
  document.body.classList.toggle('search-map-mode', isMap);
  els.listView.hidden = isMap;
  els.mapView.hidden = !isMap;
  els.viewList.setAttribute('aria-pressed', String(!isMap));
  els.viewMap.setAttribute('aria-pressed', String(isMap));
  if (isMap) setPanelOpen(false, { focus: false });
}

// 一覧を離れるとき(地図へ)スクロール位置と選択中の店を覚え、戻ったときに復元する
let selectedAtExit = null;
function leaveList() {
  listScrollY = window.scrollY;
  selectedAtExit = selectedUid;
}

function returnToList() {
  renderPeek();
  // 地図で選んだ店が「もっと見る」の奥にあっても、一覧に戻ったときに見つけられるよう表示件数を広げる
  const index = results.findIndex((r) => r.place.uid === selectedUid);
  if (index >= shown) shown = Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE;
  renderList();
  // 元のスクロール位置へ。地図で別の店を選んでいたら、その店の位置へ
  if (selectedUid && selectedUid !== selectedAtExit) scrollToCard(selectedUid);
  else window.scrollTo(0, listScrollY);
}

async function setView(view, { push = true } = {}) {
  if (view === state.view) return;
  if (view === 'map') leaveList();
  state = { ...state, view };
  applyViewToDom();
  syncUrl({ push });
  if (view === 'map') await render({ fit: true });
  else returnToList();
}

function scrollToCard(uid) {
  const card = els.results.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
  card?.scrollIntoView({ block: 'center' });
}

function selectPlace(uid) {
  selectedUid = uid;
  rememberUi('selected', uid);
  renderPeek();
  mapCtl?.focus(uid);
}

// ---------- 絞り込みパネル ----------
function setPanelOpen(open, { focus = true } = {}) {
  els.panel.hidden = !open;
  els.filterToggle.setAttribute('aria-expanded', String(open));
  if (focus) (open ? els.panel.querySelector('button, select') : els.filterToggle)?.focus();
}

const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function onPanelClick(event) {
  const t = event.target.closest('button');
  if (!t) return;
  if (t.dataset.cat) setState({ cats: toggleIn(state.cats, t.dataset.cat) });
  else if (t.dataset.src) setState({ sources: toggleIn(state.sources, t.dataset.src) });
  else if (t.dataset.st) setState({ statuses: toggleIn(state.statuses, t.dataset.st) });
  else if (t.dataset.jp) setState({ japanese: !state.japanese });
  else if (t.dataset.fact) {
    const { fact, value } = t.dataset;
    const facts = { ...state.facts };
    if (facts[fact] === value) delete facts[fact];
    else facts[fact] = value;
    setState({ facts });
  } else if (t.dataset.radius !== undefined) setState({ radius: Number(t.dataset.radius) || null });
  else if (t.dataset.anchor) return onAnchorButton(t.dataset.anchor);
  else if (t.dataset.hotel) return onHotelButton(t.dataset.hotel);
  else if (t.id === 'panel-clear') return clearAll();
  else if (t.id === 'panel-done') {
    setPanelOpen(false);
    return els.summary.scrollIntoView({ block: 'start' });
  } else return;
  render();
}

async function onAnchorButton(kind) {
  const status = $('anchor-status');
  if (kind === 'none') return clearAnchor();
  if (kind === 'hotel') return hotel && setAnchor({ kind: 'hotel', lat: hotel.lat, lng: hotel.lng, label: hotel.name });
  if (kind === 'gps') {
    status.textContent = '現在地を取得しています…(許可を求められたら「許可」を選んでください)';
    try {
      const pos = await requestPosition();
      status.textContent = '';
      setAnchor({ kind: 'gps', lat: pos.lat, lng: pos.lng, label: '現在地' });
    } catch (err) {
      status.textContent = geoErrorMessage(err?.kind);
    }
  }
}

function clearAnchor() {
  anchor = null;
  pendingHotel = null;
  $('anchor-save-wrap').innerHTML = '';
  setState({ near: null, radius: null });
  render();
}

function onHotelButton(action) {
  if (action === 'clear') {
    clearHotel(store);
    hotel = null;
    if (anchor?.kind === 'hotel') return clearAnchor();
    return render();
  }
  if (action === 'change') {
    $('anchor-address').focus();
    $('anchor-status').textContent = '新しい宿泊先のホテル名・住所を入力して検索してください。';
    return;
  }
  if (action === 'save' && pendingHotel) {
    const result = saveHotel(store, pendingHotel);
    const status = $('anchor-status');
    if (result.ok) {
      hotel = loadHotel(store);
      status.textContent = '宿泊先を保存しました(この端末だけに保存されます)。';
    } else if (result.reason === 'invalid') status.textContent = '保存できませんでした。名前を入力して、もう一度お試しください。';
    else {
      hotel = loadHotel(store);
      status.textContent = 'この端末には保存できませんでした(プライベートモードなど)。このページを開いている間だけ使えます。';
    }
    pendingHotel = null;
    $('anchor-save-wrap').innerHTML = '';
    render();
  }
}

function clearAll() {
  anchor = null;
  bbox = null;
  pendingHotel = null;
  $('anchor-save-wrap').innerHTML = '';
  setState({ ...DEFAULT_STATE, view: state.view });
  render();
}

function onActiveChipClick(event) {
  const chip = event.target.closest('[data-remove]');
  if (!chip) return;
  const [key, value] = chip.dataset.remove.split(':');
  if (key === 'all') return clearAll();
  if (key === 'q') setState({ q: '' });
  else if (key === 'cat') setState({ cats: state.cats.filter((v) => v !== value) });
  else if (key === 'src') setState({ sources: state.sources.filter((v) => v !== value) });
  else if (key === 'st') setState({ statuses: state.statuses.filter((v) => v !== value) });
  else if (key === 'jp') setState({ japanese: false });
  else if (key === 'arr') setState({ arr: 'all' });
  else if (key === 'near') return clearAnchor();
  else if (key === 'radius') setState({ radius: null });
  else if (key === 'bbox') {
    bbox = null;
    shown = PAGE_SIZE;
  } else if (key === 'fact') {
    const facts = { ...state.facts };
    delete facts[value];
    setState({ facts });
  }
  render();
}

function onResultsClick(event) {
  const suggest = event.target.closest('[data-suggest]');
  if (suggest) {
    setState({ q: suggest.dataset.suggest });
    return render();
  }
  const quickCat = event.target.closest('[data-quick-cat]');
  if (quickCat) {
    setState({ cats: [quickCat.dataset.quickCat] });
    return render();
  }
  const quickSpot = event.target.closest('[data-quick-spot]');
  if (quickSpot) {
    const spot = findSpot(quickSpot.dataset.quickSpot);
    return setAnchor({ kind: 'spot', id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.label });
  }
  if (event.target.closest('[data-quick-anchor="gps"]')) {
    setPanelOpen(true);
    return onAnchorButton('gps');
  }
  const onMap = event.target.closest('[data-action="show-on-map"]');
  if (onMap) {
    selectPlace(onMap.closest('[data-uid]').dataset.uid);
    return setView('map');
  }
  if (event.target.closest('.nearby-more-btn')) {
    shown += PAGE_SIZE;
    renderList();
  }
}

// ---------- 起動 ----------
async function init() {
  showLoading(els.results, '読み込み中…');
  const [core, aliases, aliasDict, articleData, facts] = await Promise.all([
    loadCore(),
    loadOptional('data/place-aliases.json', null),
    loadOptional('data/search-aliases.json', { groups: [] }),
    loadOptional('data/search-articles.json', { articles: [] }),
    loadOptional('data/place-facts.json', { facts: {} })
  ]);
  allData = core.data;
  placeAliases = aliases;
  placeFacts = facts.facts ?? {};
  aliasIndex = buildAliasIndex(aliasDict.groups ?? []);
  articleIndex = indexArticles(articleData.articles ?? []);
  rebuildPlaces();
  if (core.failedCount > 0) {
    document.getElementById('page-status').innerHTML = '<div class="state-box is-error" role="alert"><p class="state-message">一部のデータを読み込めなかったため、見つからない場所があるかもしれません。</p><button type="button" class="btn btn-outline state-retry">もう一度読み込む</button></div>';
    document.querySelector('#page-status .state-retry').addEventListener('click', () => location.reload());
  }

  const suburbs = [...new Set(places.map((p) => p.arrondissement).filter((a) => a && !ARRONDISSEMENTS.includes(a)))];
  els.panel.innerHTML = panelSkeleton({ arrondissements: [...ARRONDISSEMENTS, ...suburbs], factFilters: availableFactFilters(places) });

  mapCtl = createSearchMap({
    elementId: 'search-map',
    callbacks: {
      onSelect: selectPlace,
      onMovedByUser: () => {
        els.searchHere.hidden = false;
      }
    }
  });

  createGeoSearch({
    input: $('anchor-address'),
    button: $('anchor-address-btn'),
    statusEl: $('anchor-status'),
    candidatesEl: $('anchor-candidates'),
    onResolve: (point) => {
      const typed = $('anchor-address').value.trim();
      pendingHotel = { name: typed || shortLabel(point.label), lat: point.lat, lng: point.lng };
      $('anchor-save-wrap').innerHTML =
        '<div class="card-actions"><button type="button" class="btn btn-outline" data-hotel="save">この周辺を宿泊先として保存</button></div><p class="filter-note">保存すると、次回からこの端末で「宿泊先」として選べます。保存した内容は他の人にも解析にも送られません。</p>';
      setAnchor({ kind: 'address', lat: point.lat, lng: point.lng, label: point.label });
    }
  });

  bindEvents();
  applyAnchorFromState();
  applyViewToDom();
  await render({ fit: true });
}

function bindEvents() {
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    setState({ q: els.input.value.trim().slice(0, 80) });
    els.input.blur();
    render();
  });
  // 入力中もその場で絞り込む(通信は発生しない)。日本語入力の変換中は待つ
  let typingTimer = null;
  els.input.addEventListener('input', (event) => {
    if (event.isComposing) return;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setState({ q: els.input.value.trim().slice(0, 80) });
      render();
    }, 250);
  });
  els.input.addEventListener('compositionend', () => els.input.dispatchEvent(new Event('input')));

  els.filterToggle.addEventListener('click', () => setPanelOpen(els.panel.hidden));
  els.panel.addEventListener('click', onPanelClick);
  els.panel.addEventListener('change', (event) => {
    if (event.target.id === 'arr-select') {
      setState({ arr: event.target.value });
      render();
    } else if (event.target.id === 'anchor-spot' && event.target.value) {
      const spot = findSpot(event.target.value);
      setAnchor({ kind: 'spot', id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.label });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.panel.hidden) setPanelOpen(false);
  });
  els.active.addEventListener('click', onActiveChipClick);
  els.results.addEventListener('click', onResultsClick);
  els.more.addEventListener('click', onResultsClick);
  els.viewList.addEventListener('click', () => setView('list'));
  els.viewMap.addEventListener('click', () => setView('map'));
  els.mapNotice.addEventListener('click', (event) => {
    const go = event.target.closest('[data-view-go]')?.dataset.viewGo;
    if (go === 'list') setView('list');
    if (go === 'retry-map') render({ fit: true });
  });
  els.searchHere.addEventListener('click', () => {
    bbox = mapCtl.getBounds();
    shown = PAGE_SIZE;
    render();
  });
  els.peek.addEventListener('click', (event) => {
    if (event.target.closest('.peek-close')) {
      selectedUid = null;
      rememberUi('selected', null);
      renderPeek();
    }
  });
  // ブラウザの「戻る/進む」: URLの条件と表示(一覧/地図)を復元し、一覧に戻るときはスクロール位置も戻す
  window.addEventListener('popstate', async () => {
    const wasMap = document.body.classList.contains('search-map-mode');
    const next = parseSearchParams(new URLSearchParams(location.search));
    if (!wasMap && next.view === 'map') leaveList();
    state = next;
    applyAnchorFromState();
    applyViewToDom();
    shown = PAGE_SIZE;
    await render({ fit: state.view === 'map' });
    if (wasMap && state.view !== 'map') returnToList();
  });
}

runPage(init);
