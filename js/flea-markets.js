import { renderFleaMarketList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

async function init() {
  const fleaMarkets = await loadJson('data/flea-markets.json');
  document.getElementById('flea-market-list').innerHTML = renderFleaMarketList(fleaMarkets);
  setupNearbySearch(fleaMarkets);
}

init();
