import { renderMichelinList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const michelin = await loadJson('data/michelin.json');
  document.getElementById('michelin-list').innerHTML = renderMichelinList(michelin);
  setupNearbySearch(michelin);
}

init();
