import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { setupSourceTabs } from './source-tabs.js';
import { sortByStatus, tagSource, renderGroup, showGroupsLoading, loadFacts, withFacts } from './recommendations.js';
import { annotate } from './places.js';
import { renderCompareButton, initHotelCompare } from './hotel-compare.js';

// options.compare: ホテルページで「比較に追加」を出す
export function initCategoryPage(category, { compare = false } = {}) {
  return runPage(async () => {
    showGroupsLoading(['sasuke-list', 'guest-list']);
    const [recommendations, guestRecommendations, facts] = await Promise.all([
      loadJson('data/recommendations.json'),
      loadJson('data/guest-recommendations.json'),
      loadFacts()
    ]);

    const sasuke = withFacts(annotate(sortByStatus(recommendations.filter((r) => r.category === category)), 'rec'), facts);
    const guests = withFacts(annotate(guestRecommendations.filter((r) => r.category === category), 'guest'), facts);

    const renderOptions = compare ? { extra: (item) => renderCompareButton(item.uid) } : {};
    renderGroup(sasuke, 'sasuke-list', 'sasuke-empty', renderOptions);
    renderGroup(guests, 'guest-list', 'guest-empty', renderOptions);
    setupSourceTabs();
    const tagged = [...tagSource(sasuke, 'sasuke'), ...tagSource(guests, 'guest')];
    setupNearbySearch(tagged);
    if (compare) await initHotelCompare(tagged);
  });
}
