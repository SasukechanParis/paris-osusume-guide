import { renderRecommendationList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

function sortByStatus(items) {
  const order = { recommended: 0, curious: 1 };
  return [...items].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
}

async function init() {
  const recommendations = await loadJson('data/recommendations.json');
  const sasuke = sortByStatus(recommendations.filter((r) => r.category === 'hotel'));

  document.getElementById('sasuke-list').innerHTML = renderRecommendationList(sasuke);
  document.getElementById('sasuke-empty').hidden = sasuke.length > 0;

  setupNearbySearch(sasuke);
}

init();
