import { renderRecommendationList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

function sortByStatus(items) {
  const order = { recommended: 0, curious: 1 };
  return [...items].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
}

export async function initCategoryPage(category) {
  const [recommendations, guestRecommendations] = await Promise.all([
    loadJson('data/recommendations.json'),
    loadJson('data/guest-recommendations.json')
  ]);

  const sasuke = sortByStatus(recommendations.filter((r) => r.category === category));
  const guests = guestRecommendations.filter((r) => r.category === category);

  document.getElementById('sasuke-list').innerHTML = renderRecommendationList(sasuke);
  document.getElementById('sasuke-empty').hidden = sasuke.length > 0;

  document.getElementById('guest-list').innerHTML = renderRecommendationList(guests);
  document.getElementById('guest-empty').hidden = guests.length > 0;

  document.getElementById('source-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    const source = btn.dataset.source;

    document.querySelectorAll('#source-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('sasuke-panel').hidden = source !== 'sasuke';
    document.getElementById('guest-panel').hidden = source !== 'guest';
  });

  setupNearbySearch([...sasuke, ...guests]);
}
