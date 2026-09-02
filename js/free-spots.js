import { renderFleaMarketList, renderPassageList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const [freeSpots, passages] = await Promise.all([
    loadJson('data/free-spots.json'),
    loadJson('data/passages.json')
  ]);

  document.getElementById('free-spot-list').innerHTML = renderFleaMarketList(freeSpots);
  document.getElementById('passage-list').innerHTML = renderPassageList(passages);
  setupNearbySearch([...freeSpots, ...passages]);
}

init();
