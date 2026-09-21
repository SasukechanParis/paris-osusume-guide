import { sortShopsByDistance } from './nearby.js';
import { renderNearbyResults } from './render.js';
import { requestPosition, geoErrorMessage } from './geolocate.js';
import { createGeoSearch, shortLabel } from './geo-search.js';
import { MAIN_SPOTS } from './spots.js';
import { escapeHtml } from './html.js';

const PAGE_SIZE = 10;

// 近く検索。既存ページの静的フォーム(#gps-btn / #address-input / #address-search-btn / #nearby-status / #nearby-results)を
// そのまま使い、主要地点の選択・複数候補・段階表示・状態表示を足す。
//   options.idSuffix … 同一ページに複数の検索を置くとき(例 '-toilets')
//   options.onOrigin … 起点が決まったとき { lat, lng, kind, label } で呼ぶ
//   それ以外の options は renderNearbyResults に渡る(winCounts, linkToShop)
export function setupNearbySearch(items, options = {}) {
  const { idSuffix = '', onOrigin = null, ...renderOptions } = options;
  const statusEl = document.getElementById(`nearby-status${idSuffix}`);
  const resultsEl = document.getElementById(`nearby-results${idSuffix}`);
  const gpsBtn = document.getElementById(`gps-btn${idSuffix}`);
  const addressInput = document.getElementById(`address-input${idSuffix}`);
  const addressBtn = document.getElementById(`address-search-btn${idSuffix}`);
  if (!statusEl || !resultsEl || !gpsBtn || !addressInput || !addressBtn) return;

  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');

  const form = gpsBtn.closest('.nearby-form');
  const spotsEl = document.createElement('div');
  spotsEl.className = 'nearby-spots';
  spotsEl.innerHTML = `
    <p class="nearby-spots-title">または主要地点から探す</p>
    <div class="chip-row" role="group" aria-label="主要地点">
      ${MAIN_SPOTS.map((s) => `<button type="button" class="chip" data-spot="${s.id}">${s.label}</button>`).join('')}
    </div>`;
  gpsBtn.after(spotsEl);

  const candidatesEl = document.createElement('div');
  candidatesEl.className = 'nearby-candidates';
  candidatesEl.setAttribute('aria-live', 'polite');
  form.querySelector('.nearby-row').after(candidatesEl);

  const summaryEl = document.createElement('p');
  summaryEl.className = 'nearby-summary';
  summaryEl.setAttribute('aria-live', 'polite');
  summaryEl.hidden = true;
  resultsEl.before(summaryEl);

  const moreEl = document.createElement('div');
  moreEl.className = 'nearby-more';
  resultsEl.after(moreEl);

  let seq = 0; // 古い応答が新しい結果を上書きしないための世代番号
  let origin = null;
  let sorted = [];
  let shown = 0;

  function setControlsBusy(busy) {
    gpsBtn.disabled = busy;
    gpsBtn.setAttribute('aria-busy', String(busy));
  }

  function originText() {
    if (!origin) return '';
    if (origin.kind === 'gps') return '現在地';
    if (origin.kind === 'spot') return origin.label;
    return `「${escapeHtml(shortLabel(origin.label))}」付近`;
  }

  function render() {
    const visible = sorted.slice(0, shown);
    resultsEl.innerHTML = renderNearbyResults(visible, { ...renderOptions, origin });
    summaryEl.hidden = false;
    summaryEl.innerHTML =
      sorted.length === 0
        ? 'この一覧には、位置情報のあるお店がありません。'
        : `${originText()}から近い順(直線距離)・${sorted.length}件中${visible.length}件を表示`;
    const rest = sorted.length - visible.length;
    moreEl.innerHTML = rest > 0 ? `<button type="button" class="btn btn-outline nearby-more-btn">もっと見る(あと${rest}件)</button>` : '';
  }

  function setOrigin(next) {
    seq += 1;
    origin = next;
    sorted = sortShopsByDistance(items, next.lat, next.lng);
    shown = PAGE_SIZE;
    statusEl.textContent = '';
    candidatesEl.innerHTML = '';
    render();
    summaryEl.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    onOrigin?.(next);
  }

  gpsBtn.addEventListener('click', async () => {
    const mine = ++seq;
    setControlsBusy(true);
    statusEl.textContent = '現在地を取得しています…(許可を求められたら「許可」を選んでください)';
    try {
      const pos = await requestPosition();
      if (mine !== seq) return;
      setOrigin({ lat: pos.lat, lng: pos.lng, kind: 'gps', label: '現在地' });
    } catch (err) {
      if (mine !== seq) return;
      statusEl.textContent = geoErrorMessage(err?.kind);
    } finally {
      setControlsBusy(false);
    }
  });

  spotsEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-spot]');
    if (!chip) return;
    const spot = MAIN_SPOTS.find((s) => s.id === chip.dataset.spot);
    if (spot) setOrigin({ lat: spot.lat, lng: spot.lng, kind: 'spot', label: spot.label });
  });

  moreEl.addEventListener('click', (event) => {
    if (!event.target.closest('.nearby-more-btn')) return;
    shown += PAGE_SIZE;
    render();
  });

  createGeoSearch({
    input: addressInput,
    button: addressBtn,
    statusEl,
    candidatesEl,
    onResolve: (point) => setOrigin({ lat: point.lat, lng: point.lng, kind: 'address', label: point.label })
  });
}
