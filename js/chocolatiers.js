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

  const sasukeChocolatier = sortByStatus(recommendations.filter((r) => r.category === 'chocolatier'));
  const sasukePatisserie = sortByStatus(recommendations.filter((r) => r.category === 'patisserie'));
  const guestChocolatier = guestRecommendations.filter((r) => r.category === 'chocolatier');
  const guestPatisserie = guestRecommendations.filter((r) => r.category === 'patisserie');

  renderGroup(sasukeChocolatier, 'sasuke-list-chocolatier', 'sasuke-empty-chocolatier');
  renderGroup(sasukePatisserie, 'sasuke-list-patisserie', 'sasuke-empty-patisserie');
  renderGroup(guestChocolatier, 'guest-list-chocolatier', 'guest-empty-chocolatier');
  renderGroup(guestPatisserie, 'guest-list-patisserie', 'guest-empty-patisserie');

  document.getElementById('source-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    const source = btn.dataset.source;

    document.querySelectorAll('#source-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('sasuke-panel').hidden = source !== 'sasuke';
    document.getElementById('guest-panel').hidden = source !== 'guest';
  });

  setupNearbySearch([...sasukeChocolatier, ...sasukePatisserie, ...guestChocolatier, ...guestPatisserie]);
}

init();
