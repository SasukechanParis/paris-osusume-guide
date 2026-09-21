import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { setupSourceTabs } from './source-tabs.js';
import { sortByStatus, tagSource, renderGroup, showGroupsLoading, loadFacts, withFacts } from './recommendations.js';
import { annotate } from './places.js';

runPage(async () => {
  showGroupsLoading(['sasuke-list-restaurant', 'sasuke-list-japanese', 'sasuke-list-cafe', 'guest-list-restaurant', 'guest-list-cafe']);
  const [recommendations, guestRecommendations, facts] = await Promise.all([
    loadJson('data/recommendations.json'),
    loadJson('data/guest-recommendations.json'),
    loadFacts()
  ]);

  const sasukeRestaurantAll = withFacts(annotate(sortByStatus(recommendations.filter((r) => r.category === 'restaurant')), 'rec'), facts);
  const sasukeJapanese = sasukeRestaurantAll.filter((r) => r.group === 'japanese');
  const sasukeRestaurant = sasukeRestaurantAll.filter((r) => r.group !== 'japanese');
  const sasukeCafe = withFacts(annotate(sortByStatus(recommendations.filter((r) => r.category === 'cafe')), 'rec'), facts);
  const guestRestaurant = withFacts(annotate(guestRecommendations.filter((r) => r.category === 'restaurant'), 'guest'), facts);
  const guestCafe = withFacts(annotate(guestRecommendations.filter((r) => r.category === 'cafe'), 'guest'), facts);

  renderGroup(sasukeRestaurant, 'sasuke-list-restaurant', 'sasuke-empty-restaurant');
  renderGroup(sasukeJapanese, 'sasuke-list-japanese', 'sasuke-empty-japanese');
  renderGroup(sasukeCafe, 'sasuke-list-cafe', 'sasuke-empty-cafe');
  renderGroup(guestRestaurant, 'guest-list-restaurant', 'guest-empty-restaurant');
  renderGroup(guestCafe, 'guest-list-cafe', 'guest-empty-cafe');
  setupSourceTabs();

  setupNearbySearch([
    ...tagSource([...sasukeRestaurant, ...sasukeJapanese, ...sasukeCafe], 'sasuke'),
    ...tagSource([...guestRestaurant, ...guestCafe], 'guest')
  ]);
});
