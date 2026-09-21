import { renderFleaMarketList, renderPassageList } from './render.js';
import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { showGroupsLoading } from './recommendations.js';
import { annotate } from './places.js';

runPage(async () => {
  showGroupsLoading(['free-spot-list', 'passage-list-must-visit', 'passage-list-casual', 'passage-list-meh']);
  const [freeRaw, passageRaw, toilets] = await Promise.all([
    loadJson('data/free-spots.json'),
    loadJson('data/passages.json'),
    loadJson('data/toilets.json')
  ]);
  const freeSpots = annotate(freeRaw, 'free');
  const passages = annotate(passageRaw, 'passage');

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
  setupNearbySearch(annotate(toilets, 'toilet'), { idSuffix: '-toilets' });
});
