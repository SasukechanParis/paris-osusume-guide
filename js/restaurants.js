import { renderRecommendationList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

function sortByStatus(items) {
  const order = { recommended: 0, curious: 1 };
  return [...items].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
}

function renderGroup(items, listId, emptyId) {
  document.getElementById(listId).innerHTML = renderRecommendationList(items);
  document.getElementById(emptyId).hidden = items.length > 0;
}

async function init() {
  const [recommendations, guestRecommendations] = await Promise.all([
    loadJson('data/recommendations.json'),
    loadJson('data/guest-recommendations.json')
  ]);

  const sasukeRestaurant = sortByStatus(recommendations.filter((r) => r.category === 'restaurant'));
  const sasukeCafe = sortByStatus(recommendations.filter((r) => r.category === 'cafe'));
  const guestRestaurant = guestRecommendations.filter((r) => r.category === 'restaurant');
  const guestCafe = guestRecommendations.filter((r) => r.category === 'cafe');

  renderGroup(sasukeRestaurant, 'sasuke-list-restaurant', 'sasuke-empty-restaurant');
  renderGroup(sasukeCafe, 'sasuke-list-cafe', 'sasuke-empty-cafe');
  renderGroup(guestRestaurant, 'guest-list-restaurant', 'guest-empty-restaurant');
  renderGroup(guestCafe, 'guest-list-cafe', 'guest-empty-cafe');

  document.getElementById('source-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    const source = btn.dataset.source;
    document.querySelectorAll('#source-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('sasuke-panel').hidden = source !== 'sasuke';
    document.getElementById('guest-panel').hidden = source !== 'guest';
  });

  setupNearbySearch([...sasukeRestaurant, ...sasukeCafe, ...guestRestaurant, ...guestCafe]);
}

init();
