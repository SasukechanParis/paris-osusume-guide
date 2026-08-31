import { renderRecommendationList } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const recommendations = await loadJson('data/recommendations.json');

  const restaurants = recommendations.filter((r) => r.category === 'restaurant');
  const souvenirs = recommendations.filter((r) => r.category === 'souvenir');

  document.getElementById('restaurant-list').innerHTML = renderRecommendationList(restaurants);
  document.getElementById('restaurant-empty').hidden = restaurants.length > 0;

  document.getElementById('souvenir-list').innerHTML = renderRecommendationList(souvenirs);
  document.getElementById('souvenir-empty').hidden = souvenirs.length > 0;
}

init();
