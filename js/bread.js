import { renderRankingGroups, buildShopWinCounts } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

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
  setupNearbySearch(shops, { winCounts, linkToShop: true });
}

init();
