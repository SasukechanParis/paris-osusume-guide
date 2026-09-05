import { renderFleaMarketList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

async function init() {
  const [fleaMarkets, marches] = await Promise.all([
    loadJson('data/flea-markets.json'),
    loadJson('data/marches.json')
  ]);
  document.getElementById('flea-market-list').innerHTML = renderFleaMarketList(fleaMarkets);
  document.getElementById('marche-list').innerHTML = renderFleaMarketList(marches);
  setupNearbySearch([...fleaMarkets, ...marches]);
}

init();
