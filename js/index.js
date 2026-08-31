import { renderTrending } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const trending = await loadJson('data/trending.json');
  document.getElementById('trending-list').innerHTML = renderTrending(trending);
}

init();
