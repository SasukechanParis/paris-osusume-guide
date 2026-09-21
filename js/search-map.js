// 検索ページの地図ビュー。Leaflet は地図を開いたときに初めて読み込む(一覧だけなら通信しない)。
// 読み込めない・オフラインのときも、一覧で探し続けられるよう理由を伝える。

import { CATEGORY_STYLE } from './category-style.js';
import { pinIcon, youAreHereIcon, createBaseMap } from './map-shared.js';

const LEAFLET_CSS = { href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' };
const LEAFLET_JS = { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=' };
const MAX_MARKERS = 300;
const LOAD_TIMEOUT_MS = 15000;

let leafletPromise = null;

export function loadLeaflet() {
  if (globalThis.L) return Promise.resolve();
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS.href;
    css.integrity = LEAFLET_CSS.integrity;
    css.crossOrigin = '';
    document.head.append(css);
    const script = document.createElement('script');
    script.src = LEAFLET_JS.src;
    script.integrity = LEAFLET_JS.integrity;
    script.crossOrigin = '';
    const timer = setTimeout(() => reject(new Error('leaflet timeout')), LOAD_TIMEOUT_MS);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('leaflet failed'));
    };
    document.head.append(script);
  }).catch((err) => {
    leafletPromise = null; // 次に開いたとき再試行できるように
    throw err;
  });
  return leafletPromise;
}

// callbacks: { onSelect(uid), onMovedByUser() }
export function createSearchMap({ elementId, callbacks }) {
  let map = null;
  let markerLayer = null;
  let anchorLayer = null;
  const markers = new Map();
  let programmaticMoves = 0;

  // コードによる移動(結果全体を映す・選択した店へ寄る・サイズ再計算)は、利用者の操作とは区別する。
  // アニメーションを切り、移動が終わってから解除する(途中で moveend が来ても「この範囲で探す」を出さない)
  function moveProgrammatically(fn) {
    programmaticMoves += 1;
    fn();
    setTimeout(() => {
      programmaticMoves = Math.max(0, programmaticMoves - 1);
    }, 800);
  }

  async function ensure() {
    if (map) return map;
    await loadLeaflet();
    map = createBaseMap(elementId);
    markerLayer = L.layerGroup().addTo(map);
    anchorLayer = L.layerGroup().addTo(map);
    map.on('moveend', () => {
      if (programmaticMoves === 0) callbacks.onMovedByUser();
    });
    return map;
  }

  return {
    ensure,
    invalidate: () => map && moveProgrammatically(() => map.invalidateSize({ animate: false })),
    getBounds() {
      const b = map.getBounds();
      return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
    },

    // results: [{ place }]。anchor: { lat, lng, kind } | null。fit: 結果全体が入るように動かすか
    render(results, { selectedUid, anchor, radius, fit }) {
      markerLayer.clearLayers();
      anchorLayer.clearLayers();
      markers.clear();
      const shown = results.filter((r) => r.place.lat !== null).slice(0, MAX_MARKERS);
      for (const { place } of shown) {
        const color = CATEGORY_STYLE[place.category]?.color ?? '#555';
        const marker = L.marker([place.lat, place.lng], { icon: pinIcon(color), keyboard: true, title: place.name });
        marker.on('click', () => callbacks.onSelect(place.uid));
        markerLayer.addLayer(marker);
        markers.set(place.uid, marker);
      }
      if (anchor) {
        L.marker([anchor.lat, anchor.lng], { icon: youAreHereIcon(), zIndexOffset: 2000, interactive: false }).addTo(anchorLayer);
        if (radius) L.circle([anchor.lat, anchor.lng], { radius, color: '#0055a4', weight: 1, fillOpacity: 0.05, interactive: false }).addTo(anchorLayer);
      }
      const selected = selectedUid ? markers.get(selectedUid) : null;
      if (selected) selected.setZIndexOffset(1000);
      if (fit) {
        moveProgrammatically(() => {
          const points = shown.map(({ place }) => [place.lat, place.lng]);
          if (anchor) points.push([anchor.lat, anchor.lng]);
          if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16, animate: false });
          else if (points.length === 1) map.setView(points[0], 15, { animate: false });
        });
      }
      return { total: results.filter((r) => r.place.lat !== null).length, shown: shown.length };
    },

    focus(uid) {
      const marker = markers.get(uid);
      if (!marker || !map) return;
      moveProgrammatically(() => map.panTo(marker.getLatLng(), { animate: false }));
    }
  };
}
