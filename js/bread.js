import { renderRankingGroups, renderNearbyResults, buildShopWinCounts } from './render.js';
import { sortShopsByDistance } from './nearby.js';
import { geocodeAddress } from './geocode.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  const latestResults = contests
    .map((c) => results.filter((r) => r.contest_id === c.id).sort((a, b) => b.year - a.year)[0])
    .filter(Boolean);
  const winCounts = buildShopWinCounts(results);

  document.getElementById('ranking-groups').innerHTML = renderRankingGroups(latestResults, shops, contests, winCounts);
  setupNearbySearch(shops, winCounts);
}

function setupNearbySearch(shops, winCounts) {
  const statusEl = document.getElementById('nearby-status');
  const resultsEl = document.getElementById('nearby-results');

  function showResults(lat, lng) {
    const sorted = sortShopsByDistance(shops, lat, lng);
    resultsEl.innerHTML = renderNearbyResults(sorted, winCounts);
    statusEl.textContent = '';
  }

  document.getElementById('gps-btn').addEventListener('click', () => {
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

  document.getElementById('address-search-btn').addEventListener('click', async () => {
    const query = document.getElementById('address-input').value.trim();
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

init();
