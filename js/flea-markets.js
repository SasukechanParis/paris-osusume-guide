import { renderFleaMarketList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const fleaMarkets = await loadJson('data/flea-markets.json');
  document.getElementById('flea-market-list').innerHTML = renderFleaMarketList(fleaMarkets);
  setupNearbySearch(fleaMarkets);
}

init();
