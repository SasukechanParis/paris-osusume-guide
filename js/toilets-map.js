import { arrondissementLabel } from './render.js';
import { geocodeAddress } from './geocode.js';
import { loadJson } from './data.js';

const TOILET_COLOR = '#7f8c8d';

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

function pinIcon(color) {
  const svg = `
    <svg width="27" height="38" viewBox="0 0 27 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 0C6.04 0 0 6.04 0 13.5 0 23.63 13.5 38 13.5 38S27 23.63 27 13.5C27 6.04 20.96 0 13.5 0z"
            fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>
      <circle cx="13.5" cy="13.5" r="5.5" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    className: 'map-pin',
    html: svg,
    iconSize: [27, 38],
    iconAnchor: [13.5, 38],
    popupAnchor: [0, -34]
  });
}

function youAreHereIcon() {
  return L.divIcon({
    className: 'map-you-marker',
    html: '<div class="map-you-pulse"></div><div class="map-you-dot"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function popupHtml(toilet) {
  const badges = [];
  if (toilet.pmr_accessible) badges.push('車椅子対応');
  if (toilet.baby_changing) badges.push('おむつ交換台あり');
  return `
    <div class="map-popup">
      <p class="map-popup-name">${toilet.name}</p>
      <p class="map-popup-meta">${arrondissementLabel(toilet.arrondissement)} ・ ${toilet.hours}</p>
      ${badges.length ? `<p class="map-popup-desc">${badges.join(' ・ ')}</p>` : ''}
      <div class="map-popup-links">
        ${toilet.google_maps_url ? `<a class="btn btn-outline shop-map-link" href="${toilet.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>` : ''}
      </div>
    </div>`;
}

async function init() {
  const toilets = await loadJson('data/toilets.json');

  const map = L.map('map-canvas', { zoomControl: false }).setView([48.8613, 2.3324], 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const entries = [];
  for (const toilet of toilets) {
    if (toilet.lat === null) continue;
    const marker = L.marker([toilet.lat, toilet.lng], { icon: pinIcon(TOILET_COLOR) });
    marker.bindPopup(popupHtml(toilet));
    entries.push({ marker, arrondissement: toilet.arrondissement });
    marker.addTo(map);
  }

  let selectedArrondissement = 'all';

  function applyFilter() {
    for (const entry of entries) {
      const matches = selectedArrondissement === 'all' || entry.arrondissement === selectedArrondissement;
      const onMap = map.hasLayer(entry.marker);
      if (matches && !onMap) entry.marker.addTo(map);
      if (!matches && onMap) map.removeLayer(entry.marker);
    }
  }

  const legendEl = document.getElementById('map-legend');
  const presentArrondissements = ARRONDISSEMENT_ORDER.filter((a) => entries.some((e) => e.arrondissement === a));
  const arrondissementOptions = presentArrondissements
    .map((a) => `<option value="${a}">${arrondissementLabel(a)}</option>`)
    .join('');

  legendEl.innerHTML = `
    <div class="map-legend-header">
      <span class="map-legend-title">絞り込み</span>
      <button id="map-legend-toggle" class="map-legend-toggle" type="button" aria-controls="map-legend-body">▾</button>
    </div>
    <div id="map-legend-body" class="map-legend-body">
      <div class="map-search-box">
        <input id="map-address-input" class="map-search-input" type="text" placeholder="住所・ホテル名で検索">
        <button id="map-address-btn" class="map-search-btn" type="button">検索</button>
      </div>
      <p id="map-search-status" class="map-search-status"></p>
      <div class="map-legend-filter">
        <label for="map-arrondissement-select">エリアで絞り込み</label>
        <select id="map-arrondissement-select">
          <option value="all">すべてのエリア</option>
          ${arrondissementOptions}
        </select>
      </div>
    </div>`;

  const legendToggle = document.getElementById('map-legend-toggle');
  const legendBody = document.getElementById('map-legend-body');

  function setLegendExpanded(expanded) {
    legendBody.hidden = !expanded;
    legendToggle.setAttribute('aria-expanded', String(expanded));
    legendToggle.textContent = expanded ? '▴' : '▾';
  }

  setLegendExpanded(!window.matchMedia('(max-width: 479px)').matches);
  legendToggle.addEventListener('click', () => {
    setLegendExpanded(legendToggle.getAttribute('aria-expanded') !== 'true');
  });

  let searchMarker = null;
  let locateMarker = null;
  const searchStatusEl = document.getElementById('map-search-status');

  function setSearchMarker(lat, lng, label) {
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lng], { icon: pinIcon('#1a1a2e'), zIndexOffset: 1000 }).addTo(map);
    if (label) searchMarker.bindPopup(`<div class="map-popup"><p class="map-popup-name">${label}</p></div>`).openPopup();
    map.setView([lat, lng], 15);
  }

  const addressInput = document.getElementById('map-address-input');
  const addressBtn = document.getElementById('map-address-btn');

  async function runAddressSearch() {
    const query = addressInput.value.trim();
    if (!query) return;
    searchStatusEl.textContent = '検索しています…';
    try {
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        searchStatusEl.textContent = '住所が見つかりませんでした。表記を変えて試してください。';
        return;
      }
      setSearchMarker(matches[0].lat, matches[0].lng, matches[0].label);
      searchStatusEl.textContent = '';
    } catch (err) {
      searchStatusEl.textContent = '検索中にエラーが発生しました。しばらくしてから再度お試しください。';
    }
  }

  addressBtn.addEventListener('click', runAddressSearch);
  addressInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runAddressSearch();
  });

  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const container = L.DomUtil.create('div', 'leaflet-bar map-locate-control');
      const button = L.DomUtil.create('a', 'map-locate-btn', container);
      button.href = '#';
      button.title = '現在地を表示';
      button.setAttribute('role', 'button');
      button.setAttribute('aria-label', '現在地を表示');
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        locateMe();
      });
      return container;
    }
  });
  map.addControl(new LocateControl());

  function locateMe() {
    if (!navigator.geolocation) {
      searchStatusEl.textContent = 'この端末は現在地取得に対応していません。住所で検索してください。';
      return;
    }
    searchStatusEl.textContent = '現在地を取得しています…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (locateMarker) map.removeLayer(locateMarker);
        locateMarker = L.marker([latitude, longitude], { icon: youAreHereIcon(), zIndexOffset: 2000 }).addTo(map);
        map.setView([latitude, longitude], 15);
        searchStatusEl.textContent = '';
      },
      () => { searchStatusEl.textContent = '現在地を取得できませんでした。住所で検索してください。'; }
    );
  }

  legendEl.addEventListener('change', (event) => {
    const select = event.target.closest('#map-arrondissement-select');
    if (select) {
      selectedArrondissement = select.value;
      applyFilter();
    }
  });
}

init();
