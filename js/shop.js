import { renderShopDetail } from './render.js';
import { loadJson } from './data.js';

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const [shops, results, contests] = await Promise.all([
    loadJson('data/shops.json'),
    loadJson('data/results.json'),
    loadJson('data/contests.json')
  ]);

  const shop = shops.find((s) => s.id === id);
  if (!shop) {
    document.getElementById('shop-detail').textContent = 'お店が見つかりませんでした。';
    return;
  }

  const detail = renderShopDetail(shop, results, contests);

  document.getElementById('shop-title').textContent = detail.name;
  document.getElementById('shop-meta').innerHTML = detail.meta;
  document.getElementById('shop-note').innerHTML = detail.note;
  document.getElementById('shop-win-summary').textContent = detail.winSummary;
  document.getElementById('shop-win-summary').hidden = !detail.winSummary;
  document.getElementById('shop-map-link').innerHTML = detail.mapLink;
  document.getElementById('shop-history').innerHTML = detail.rows;
}

init();
