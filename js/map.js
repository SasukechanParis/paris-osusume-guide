import { arrondissementLabel } from './render.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { CATEGORY_STYLE } from './category-style.js';
import { leafletAvailable, showMapUnavailable, createBaseMap, pinIcon, popupHtml, setupMapChrome } from './map-shared.js';

// 色・表示名は検索ページと共有(js/category-style.js)。トイレだけ件数が多いので初期非表示・遅延読み込み。
const CATEGORIES = {
  ...CATEGORY_STYLE,
  toilet: { ...CATEGORY_STYLE.toilet, defaultVisible: false, lazy: true }
};

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

const PARIS_ARRONDISSEMENTS = new Set(ARRONDISSEMENT_ORDER.slice(0, 20));

const SOURCES = {
  shops: 'data/shops.json',
  results: 'data/results.json',
  recommendations: 'data/recommendations.json',
  guestRecommendations: 'data/guest-recommendations.json',
  trending: 'data/trending.json',
  michelin: 'data/michelin.json',
  fleaMarkets: 'data/flea-markets.json',
  marches: 'data/marches.json',
  freeSpots: 'data/free-spots.json',
  passages: 'data/passages.json'
};

// 1つのJSONが失敗しても、読めた分の地図は表示する
async function loadSources() {
  const settled = await Promise.all(
    Object.entries(SOURCES).map(async ([key, path]) => {
      try {
        return { key, data: await loadJson(path), failed: false };
      } catch (err) {
        console.error(err);
        return { key, data: [], failed: true };
      }
    })
  );
  return {
    data: Object.fromEntries(settled.map((s) => [s.key, s.data])),
    failedCount: settled.filter((s) => s.failed).length
  };
}

function toiletPoints(toilets) {
  return toilets.map((t) => ({
    category: 'toilet',
    arrondissement: t.arrondissement,
    lat: t.lat,
    lng: t.lng,
    name: t.name,
    address: t.address,
    meta: `${arrondissementLabel(t.arrondissement)} ・ ${t.hours}`,
    description: t.description,
    mapUrl: t.google_maps_url,
    sourceUrl: t.source_url
  }));
}

function buildPoints({ shops, results, recommendations, guestRecommendations, trending, michelin, fleaMarkets, marches, freeSpots, passages }) {
  const points = [];

  const shopById = new Map(shops.map((s) => [s.id, s]));
  const latestByContest = new Map();
  for (const r of results) {
    const current = latestByContest.get(r.contest_id);
    if (!current || r.year > current.year) latestByContest.set(r.contest_id, r);
  }
  const seenShopIds = new Set();
  for (const result of latestByContest.values()) {
    for (const ranking of result.rankings) {
      if (!ranking.shop_id || seenShopIds.has(ranking.shop_id)) continue;
      const shop = shopById.get(ranking.shop_id);
      if (!shop || shop.lat === null) continue;
      seenShopIds.add(ranking.shop_id);
      points.push({
        category: 'contest',
        arrondissement: shop.arrondissement,
        lat: shop.lat,
        lng: shop.lng,
        name: shop.name,
        address: shop.address,
        meta: arrondissementLabel(shop.arrondissement),
        description: shop.description,
        mapUrl: shop.google_maps_url,
        sourceUrl: result.source_url
      });
    }
  }

  for (const item of [...recommendations, ...guestRecommendations]) {
    if (item.lat === null) continue;
    points.push({
      category: item.category,
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      address: item.address,
      meta: `${arrondissementLabel(item.arrondissement)} ・ ${item.address}`,
      description: item.description,
      mapUrl: item.google_maps_url,
      sourceUrl: null
    });
  }

  for (const t of trending) {
    points.push({
      category: 'trending',
      arrondissement: t.arrondissement,
      lat: t.lat,
      lng: t.lng,
      name: t.name,
      address: t.address,
      meta: arrondissementLabel(t.arrondissement),
      description: t.description,
      mapUrl: t.google_maps_url,
      sourceUrl: t.source_url
    });
  }

  for (const m of michelin) {
    if (m.lat === null) continue;
    const metaParts = [arrondissementLabel(m.arrondissement)];
    if (m.address) metaParts.push(m.address + (m.hotel ? ` (${m.hotel})` : ''));
    points.push({
      category: 'michelin',
      arrondissement: m.arrondissement,
      lat: m.lat,
      lng: m.lng,
      name: `${m.name} ${'★'.repeat(m.stars)}`,
      address: m.address,
      meta: metaParts.join(' ・ '),
      description: m.description,
      mapUrl: m.google_maps_url,
      sourceUrl: m.source_url
    });
  }

  for (const f of [...fleaMarkets, ...marches]) {
    points.push({
      category: 'flea_market',
      arrondissement: f.arrondissement,
      lat: f.lat,
      lng: f.lng,
      name: f.name,
      address: f.address,
      meta: `${arrondissementLabel(f.arrondissement)} ・ ${f.hours}`,
      description: f.description,
      mapUrl: f.google_maps_url,
      sourceUrl: f.source_url
    });
  }

  for (const f of freeSpots) {
    points.push({
      category: 'free_spot',
      arrondissement: f.arrondissement,
      lat: f.lat,
      lng: f.lng,
      name: f.name,
      address: f.address,
      meta: `${arrondissementLabel(f.arrondissement)} ・ ${f.hours}`,
      description: f.description,
      mapUrl: f.google_maps_url,
      sourceUrl: f.source_url
    });
  }

  for (const p of passages) {
    points.push({
      category: 'free_spot',
      arrondissement: p.arrondissement,
      lat: p.lat,
      lng: p.lng,
      name: p.name,
      address: p.address,
      meta: arrondissementLabel(p.arrondissement),
      description: p.description,
      mapUrl: p.google_maps_url,
      sourceUrl: null
    });
  }

  return points;
}

async function init() {
  const canvas = document.getElementById('map-canvas');
  const noticeEl = document.getElementById('map-notice');
  if (!leafletAvailable()) {
    showMapUnavailable(noticeEl);
    return;
  }

  const map = createBaseMap('map-canvas');
  const { data, failedCount } = await loadSources();
  const entries = [];

  function addEntries(points) {
    for (const point of points) {
      const config = CATEGORIES[point.category];
      if (!config) continue;
      const marker = L.marker([point.lat, point.lng], { icon: pinIcon(config.color) });
      marker.bindPopup(popupHtml({ ...point, categoryLabel: config.label }), { maxWidth: 280 });
      entries.push({ marker, category: point.category, arrondissement: point.arrondissement });
    }
  }
  addEntries(buildPoints(data));

  const selectedCategories = new Set(
    Object.entries(CATEGORIES)
      .filter(([, config]) => config.defaultVisible !== false)
      .map(([key]) => key)
  );
  let selectedArrondissement = 'all';
  const countEl = document.getElementById('map-count');

  function applyFilters() {
    let visible = 0;
    for (const entry of entries) {
      const matches =
        selectedCategories.has(entry.category) &&
        (selectedArrondissement === 'all' || entry.arrondissement === selectedArrondissement);
      const onMap = map.hasLayer(entry.marker);
      if (matches && !onMap) entry.marker.addTo(map);
      if (!matches && onMap) map.removeLayer(entry.marker);
      if (matches) visible += 1;
    }
    countEl.textContent = `表示中 ${visible}件`;
    noticeEl.innerHTML =
      visible === 0
        ? '<div class="state-box is-empty" role="status">条件に合う場所がありません。「絞り込み」でカテゴリやエリアを変えてください。</div>'
        : failedCount > 0
          ? '<div class="state-box is-error" role="alert"><p class="state-message">一部のデータを読み込めなかったため、表示されていない場所があります。</p><button type="button" class="btn btn-outline state-retry">もう一度読み込む</button></div>'
          : '';
    noticeEl.querySelector('.state-retry')?.addEventListener('click', () => location.reload());
  }

  // --- 絞り込みシート ---
  const sheetEl = document.getElementById('map-sheet');
  // パリ20区は常に選べる(トイレは後から読み込むため)。郊外の県はデータがあるものだけ
  const presentArrondissements = ARRONDISSEMENT_ORDER.filter(
    (a) => PARIS_ARRONDISSEMENTS.has(a) || entries.some((e) => e.arrondissement === a)
  );
  sheetEl.innerHTML = `
    <div class="map-sheet-head">
      <h2 class="map-sheet-title">絞り込み</h2>
      <button type="button" class="map-sheet-close">閉じる</button>
    </div>
    <label class="field-label" for="map-arrondissement-select">エリア</label>
    <select id="map-arrondissement-select">
      <option value="all">すべてのエリア</option>
      ${presentArrondissements.map((a) => `<option value="${a}">${arrondissementLabel(a)}</option>`).join('')}
    </select>
    <p class="field-label">表示するカテゴリ</p>
    <div class="map-category-grid">
      ${Object.entries(CATEGORIES)
        .map(
          ([key, config]) => `
        <label class="map-category-item">
          <input type="checkbox" data-category="${key}" ${config.defaultVisible === false ? '' : 'checked'}>
          <span class="map-legend-dot" style="background:${config.color}"></span>
          <span>${config.label}${config.defaultVisible === false ? '(件数が多いため初期は非表示)' : ''}</span>
        </label>`
        )
        .join('')}
    </div>
    <p class="field-label" id="map-sheet-status" role="status" aria-live="polite"></p>`;
  const sheetStatusEl = document.getElementById('map-sheet-status');

  // 件数の多いトイレは、チェックされて初めてJSONを取得してピンを作る
  let toiletsState = 'idle'; // idle | loading | loaded
  async function ensureToilets() {
    if (toiletsState !== 'idle') return true;
    toiletsState = 'loading';
    sheetStatusEl.textContent = 'トイレのデータを読み込んでいます…';
    try {
      const toilets = await loadJson('data/toilets.json');
      addEntries(toiletPoints(toilets.filter((t) => t.lat !== null)));
      toiletsState = 'loaded';
      sheetStatusEl.textContent = '';
      return true;
    } catch (err) {
      console.error(err);
      toiletsState = 'idle';
      sheetStatusEl.textContent = 'トイレのデータを読み込めませんでした。通信状況を確認して、もう一度お試しください。';
      return false;
    }
  }

  sheetEl.addEventListener('change', async (event) => {
    const checkbox = event.target.closest('input[data-category]');
    if (checkbox) {
      const key = checkbox.dataset.category;
      if (checkbox.checked) {
        if (CATEGORIES[key].lazy && !(await ensureToilets())) {
          checkbox.checked = false;
          return;
        }
        selectedCategories.add(key);
      } else {
        selectedCategories.delete(key);
      }
      applyFilters();
      return;
    }
    if (event.target.id === 'map-arrondissement-select') {
      selectedArrondissement = event.target.value;
      applyFilters();
    }
  });

  setupMapChrome({
    map,
    sheetEl,
    toggleBtn: document.getElementById('map-filter-toggle'),
    searchInput: document.getElementById('map-address-input'),
    searchBtn: document.getElementById('map-address-btn'),
    statusEl: document.getElementById('map-search-status'),
    candidatesEl: document.getElementById('map-candidates')
  });

  applyFilters();
  canvas.dataset.ready = '1';
}

runPage(init);
