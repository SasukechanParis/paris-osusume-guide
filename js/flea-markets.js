import { renderFleaMarketList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { showGroupsLoading } from './recommendations.js';
import { annotate } from './places.js';

runPage(async () => {
  showGroupsLoading(['flea-market-list', 'marche-list']);
  const [fleaRaw, marchesRaw] = await Promise.all([
    loadJson('data/flea-markets.json'),
    loadJson('data/marches.json')
  ]);
  const fleaMarkets = annotate(fleaRaw, 'flea');
  const marches = annotate(marchesRaw, 'march');
  document.getElementById('flea-market-list').innerHTML = renderFleaMarketList(fleaMarkets);
  document.getElementById('marche-list').innerHTML = renderFleaMarketList(marches);
  setupNearbySearch([...fleaMarkets, ...marches]);
});
