import { setupNearbySearch } from './nearby-search.js';
import { loadJson } from './data.js';
import { runPage } from './page-init.js';
import { setupSourceTabs } from './source-tabs.js';
import { sortByStatus, tagSource, renderGroup, showGroupsLoading, loadFacts, withFacts } from './recommendations.js';
import { annotate } from './places.js';

runPage(async () => {
  showGroupsLoading(['sasuke-list-chocolatier', 'sasuke-list-patisserie', 'guest-list-chocolatier', 'guest-list-patisserie']);
  const [recommendations, guestRecommendations, facts] = await Promise.all([
    loadJson('data/recommendations.json'),
    loadJson('data/guest-recommendations.json'),
    loadFacts()
  ]);

  const sasukeChocolatier = withFacts(annotate(sortByStatus(recommendations.filter((r) => r.category === 'chocolatier')), 'rec'), facts);
  const sasukePatisserie = withFacts(annotate(sortByStatus(recommendations.filter((r) => r.category === 'patisserie')), 'rec'), facts);
  const guestChocolatier = withFacts(annotate(guestRecommendations.filter((r) => r.category === 'chocolatier'), 'guest'), facts);
  const guestPatisserie = withFacts(annotate(guestRecommendations.filter((r) => r.category === 'patisserie'), 'guest'), facts);

  renderGroup(sasukeChocolatier, 'sasuke-list-chocolatier', 'sasuke-empty-chocolatier');
  renderGroup(sasukePatisserie, 'sasuke-list-patisserie', 'sasuke-empty-patisserie');
  renderGroup(guestChocolatier, 'guest-list-chocolatier', 'guest-empty-chocolatier');
  renderGroup(guestPatisserie, 'guest-list-patisserie', 'guest-empty-patisserie');
  setupSourceTabs();

  setupNearbySearch([
    ...tagSource([...sasukeChocolatier, ...sasukePatisserie], 'sasuke'),
    ...tagSource([...guestChocolatier, ...guestPatisserie], 'guest')
  ]);
});
