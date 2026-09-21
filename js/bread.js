import { renderRankingGroups, buildShopWinCounts } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { showEmpty } from './ui-status.js';
import { annotate } from './places.js';

runPage(async () => {
  const groupsEl = document.getElementById('ranking-groups');
  showEmpty(groupsEl, '読み込み中…');
  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  const latestResults = contests
    .map((c) => results.filter((r) => r.contest_id === c.id).sort((a, b) => b.year - a.year)[0])
    .filter(Boolean);
  const winCounts = buildShopWinCounts(results);

  groupsEl.innerHTML = renderRankingGroups(latestResults, shops, contests, winCounts);
  setupNearbySearch(annotate(shops, 'shop'), { winCounts, linkToShop: true });
});
