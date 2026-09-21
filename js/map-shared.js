// 地図ページ(総合地図・トイレマップ)の共通部品。Leaflet はグローバル L(CDNから読み込み)を使う。
// CDNが読めない・オフラインでも、一覧から探せることを案内して操作不能にしない。

import { requestPosition, geoErrorMessage } from './geolocate.js';
import { createGeoSearch, shortLabel } from './geo-search.js';
import { renderCardActions } from './render.js';
import { escapeHtml } from './html.js';

export const PARIS_CENTER = [48.8613, 2.3324];

export function leafletAvailable() {
  return typeof globalThis.L !== 'undefined';
}

export function showMapUnavailable(container) {
  container.innerHTML = `
    <div class="state-box is-error" role="alert">
      <p class="state-message">地図を読み込めませんでした。電波の届く場所でもう一度お試しください(オフライン時は地図を使えません)。地図なしでも、下のページから近い順に探せます。</p>
      <div class="card-actions">
        <a class="btn btn-outline" href="index.html#find-h">近くから探す</a>
        <button type="button" class="btn btn-outline state-retry">もう一度読み込む</button>
      </div>
    </div>`;
  container.querySelector('.state-retry')?.addEventListener('click', () => location.reload());
}

export function pinIcon(color) {
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

export function youAreHereIcon() {
  return L.divIcon({
    className: 'map-you-marker',
    html: '<div class="map-you-pulse"></div><div class="map-you-dot"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export function createBaseMap(elementId) {
  const map = L.map(elementId, { zoomControl: false }).setView(PARIS_CENTER, 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return map;
}

// point: { name, address, lat, lng, mapUrl, sourceUrl, meta, description, categoryLabel }
export function popupHtml(point) {
  const place = { name: point.name, address: point.address, lat: point.lat, lng: point.lng, google_maps_url: point.mapUrl };
  const source = point.sourceUrl ? `<a class="ranking-source" href="${point.sourceUrl}">出典 ↗</a>` : '';
  return `
    <div class="map-popup">
      ${point.categoryLabel ? `<p class="map-popup-category">${point.categoryLabel}</p>` : ''}
      <p class="map-popup-name">${point.name}</p>
      ${point.meta ? `<p class="map-popup-meta">${point.meta}</p>` : ''}
      ${point.description ? `<p class="map-popup-desc">${point.description}</p>` : ''}
      ${renderCardActions(place, { extra: source })}
    </div>`;
}

// 検索・現在地・絞り込みシートの共通の配線。
export function setupMapChrome({ map, sheetEl, toggleBtn, searchInput, searchBtn, statusEl, candidatesEl }) {
  let searchMarker = null;
  let locateMarker = null;

  const setStatus = (text) => {
    statusEl.textContent = text;
  };

  // --- 絞り込みシート(開いたらフォーカスを移し、閉じたらボタンへ戻す) ---
  function setSheetOpen(open) {
    sheetEl.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) sheetEl.querySelector('.map-sheet-close')?.focus();
    else toggleBtn.focus();
  }
  toggleBtn.addEventListener('click', () => setSheetOpen(sheetEl.hidden));
  sheetEl.addEventListener('click', (event) => {
    if (event.target.closest('.map-sheet-close')) setSheetOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !sheetEl.hidden) setSheetOpen(false);
  });

  // --- 住所・ホテル名の検索 ---
  function showSearchResult(point) {
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([point.lat, point.lng], { icon: pinIcon('#1a1a2e'), zIndexOffset: 1000 }).addTo(map);
    searchMarker
      .bindPopup(`<div class="map-popup"><p class="map-popup-name">${escapeHtml(shortLabel(point.label))}</p></div>`)
      .openPopup();
    map.setView([point.lat, point.lng], 15);
    setStatus(`「${shortLabel(point.label)}」付近を表示しています`);
  }
  createGeoSearch({ input: searchInput, button: searchBtn, statusEl, candidatesEl, onResolve: showSearchResult });

  // --- 現在地(ボタンを押したときだけ許可を求める) ---
  async function locateMe() {
    setStatus('現在地を取得しています…(許可を求められたら「許可」を選んでください)');
    try {
      const pos = await requestPosition();
      if (locateMarker) map.removeLayer(locateMarker);
      locateMarker = L.marker([pos.lat, pos.lng], { icon: youAreHereIcon(), zIndexOffset: 2000 }).addTo(map);
      map.setView([pos.lat, pos.lng], 15);
      setStatus('');
    } catch (err) {
      setStatus(geoErrorMessage(err?.kind));
    }
  }
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

  return { setStatus, setSheetOpen };
}
