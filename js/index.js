import { renderTrending, renderUpdatesList } from './render.js';
import { loadJson } from './data.js';

async function init() {
  const [trending, updates] = await Promise.all([
    loadJson('data/trending.json'),
    loadJson('data/updates.json')
  ]);
  document.getElementById('trending-list').innerHTML = renderTrending(trending);
  document.getElementById('updates-list').innerHTML = renderUpdatesList(updates);
}

init();
