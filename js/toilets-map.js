import { arrondissementLabel } from './render.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { leafletAvailable, showMapUnavailable, createBaseMap, pinIcon, popupHtml, setupMapChrome } from './map-shared.js';

const TOILET_COLOR = '#7f8c8d';

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

function toiletPopup(toilet) {
  const badges = [];
  if (toilet.pmr_accessible) badges.push('車椅子対応');
  if (toilet.baby_changing) badges.push('おむつ交換台あり');
  return popupHtml({
    name: toilet.name,
    address: toilet.address,
    lat: toilet.lat,
    lng: toilet.lng,
    meta: `${arrondissementLabel(toilet.arrondissement)} ・ ${toilet.hours}`,
    description: badges.join(' ・ '),
    mapUrl: toilet.google_maps_url,
    sourceUrl: null
  });
}

async function init() {
  const noticeEl = document.getElementById('map-notice');
  if (!leafletAvailable()) {
    showMapUnavailable(noticeEl);
    return;
  }

  const map = createBaseMap('map-canvas');
  const toilets = await loadJson('data/toilets.json');

  const entries = [];
  for (const toilet of toilets) {
    if (toilet.lat === null) continue;
    const marker = L.marker([toilet.lat, toilet.lng], { icon: pinIcon(TOILET_COLOR) });
    marker.bindPopup(toiletPopup(toilet), { maxWidth: 280 });
    entries.push({ marker, arrondissement: toilet.arrondissement });
  }

  let selectedArrondissement = 'all';
  const countEl = document.getElementById('map-count');

  function applyFilter() {
    let visible = 0;
    for (const entry of entries) {
      const matches = selectedArrondissement === 'all' || entry.arrondissement === selectedArrondissement;
      const onMap = map.hasLayer(entry.marker);
      if (matches && !onMap) entry.marker.addTo(map);
      if (!matches && onMap) map.removeLayer(entry.marker);
      if (matches) visible += 1;
    }
    countEl.textContent = `表示中 ${visible}件`;
    noticeEl.innerHTML =
      visible === 0 ? '<div class="state-box is-empty" role="status">このエリアにはトイレのデータがありません。</div>' : '';
  }

  const sheetEl = document.getElementById('map-sheet');
  const presentArrondissements = ARRONDISSEMENT_ORDER.filter((a) => entries.some((e) => e.arrondissement === a));
  sheetEl.innerHTML = `
    <div class="map-sheet-head">
      <h2 class="map-sheet-title">絞り込み</h2>
      <button type="button" class="map-sheet-close">閉じる</button>
    </div>
    <label class="field-label" for="map-arrondissement-select">エリア</label>
    <select id="map-arrondissement-select">
      <option value="all">すべてのエリア</option>
      ${presentArrondissements.map((a) => `<option value="${a}">${arrondissementLabel(a)}</option>`).join('')}
    </select>`;
  sheetEl.addEventListener('change', (event) => {
    if (event.target.id === 'map-arrondissement-select') {
      selectedArrondissement = event.target.value;
      applyFilter();
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

  applyFilter();
}

runPage(init);
