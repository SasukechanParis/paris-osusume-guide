import { sortShopsByDistance } from './nearby.js';
import { geocodeAddress } from './geocode.js';
import { renderNearbyResults } from './render.js';

export function setupNearbySearch(items, options = {}) {
  const statusEl = document.getElementById('nearby-status');
  const resultsEl = document.getElementById('nearby-results');
  const gpsBtn = document.getElementById('gps-btn');
  const addressInput = document.getElementById('address-input');
  const addressBtn = document.getElementById('address-search-btn');
  if (!statusEl || !resultsEl || !gpsBtn || !addressInput || !addressBtn) return;

  function showResults(lat, lng) {
    const sorted = sortShopsByDistance(items, lat, lng);
    resultsEl.innerHTML = renderNearbyResults(sorted, options);
    statusEl.textContent = '';
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusEl.textContent = 'この端末は現在地取得に対応していません。住所で検索してください。';
      return;
    }
    statusEl.textContent = '現在地を取得しています…';
    navigator.geolocation.getCurrentPosition(
      (pos) => showResults(pos.coords.latitude, pos.coords.longitude),
      () => { statusEl.textContent = '現在地を取得できませんでした。住所で検索してください。'; }
    );
  });

  addressBtn.addEventListener('click', async () => {
    const query = addressInput.value.trim();
    if (!query) return;
    statusEl.textContent = '検索しています…';
    try {
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        statusEl.textContent = '住所が見つかりませんでした。表記を変えて試してください。';
        return;
      }
      showResults(matches[0].lat, matches[0].lng);
    } catch (err) {
      statusEl.textContent = '検索中にエラーが発生しました。しばらくしてから再度お試しください。';
    }
  });
}
