import { renderRecommendationList } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

function sortByStatus(items) {
  const order = { recommended: 0, curious: 1 };
  return [...items].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
}

async function init() {
  const recommendations = await loadJson('data/recommendations.json');

  const restaurants = sortByStatus(recommendations.filter((r) => r.category === 'restaurant'));
  const chocolatiers = sortByStatus(recommendations.filter((r) => r.category === 'chocolatier'));
  const souvenirs = sortByStatus(recommendations.filter((r) => r.category === 'souvenir'));

  document.getElementById('restaurant-list').innerHTML = renderRecommendationList(restaurants);
  document.getElementById('restaurant-empty').hidden = restaurants.length > 0;

  document.getElementById('chocolatier-list').innerHTML = renderRecommendationList(chocolatiers);
  document.getElementById('chocolatier-empty').hidden = chocolatiers.length > 0;

  document.getElementById('souvenir-list').innerHTML = renderRecommendationList(souvenirs);
  document.getElementById('souvenir-empty').hidden = souvenirs.length > 0;
}

init();
