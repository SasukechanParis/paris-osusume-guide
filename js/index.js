import { renderTrending, renderUpdatesList } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const [trending, updates] = await Promise.all([
    loadJson('data/trending.json'),
    loadJson('data/updates.json')
  ]);
  document.getElementById('trending-list').innerHTML = renderTrending(trending);
  document.getElementById('updates-list').innerHTML = renderUpdatesList(updates);
}

init();
