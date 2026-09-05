import { renderFleaMarketList, renderPassageList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';

async function init() {
  const [freeSpots, passages, toilets] = await Promise.all([
    loadJson('data/free-spots.json'),
    loadJson('data/passages.json'),
    loadJson('data/toilets.json')
  ]);

  document.getElementById('free-spot-list').innerHTML = renderFleaMarketList(freeSpots);

  document.getElementById('passage-list-must-visit').innerHTML = renderPassageList(
    passages.filter((p) => p.tier === 'must_visit')
  );
  document.getElementById('passage-list-casual').innerHTML = renderPassageList(
    passages.filter((p) => p.tier === 'casual')
  );
  document.getElementById('passage-list-meh').innerHTML = renderPassageList(
    passages.filter((p) => p.tier === 'meh')
  );

  setupNearbySearch([...freeSpots, ...passages]);
  setupNearbySearch(toilets, { idSuffix: '-toilets' });
}

init();
