import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderProgramList,
  renderRankingGroups,
  renderNearbyResults,
  renderContestDetail,
  renderYearTabs,
  renderYearPanel
} from '../js/render.js';

const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', category: 'baguette', next_edition_date: null }
];

test('renderProgramList includes contest icon image', () => {
  const html = renderProgramList(contests);
  assert.match(html, /baguette\.jpg/);
});

const shops = [
  { id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e', google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129' }
];
const results = [
  {
    contest_id: 'baguette',
    year: 2026,
    rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }],
    source_url: 'https://presse.paris.fr/example'
  }
];

test('renderProgramList includes contest name and organizer', () => {
  const html = renderProgramList(contests);
  assert.match(html, /Grand Prix de la Baguette/);
  assert.match(html, /パリ市/);
});

test('renderRankingGroups includes shop name, arrondissement in Japanese, source link, and contest detail link', () => {
  const html = renderRankingGroups(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14区/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
  assert.match(html, /href="contest\.html\?id=baguette"/);
});

test('renderNearbyResults shows shop name, arrondissement in Japanese, formatted distance, and maps link', () => {
  const sorted = [
    {
      shop: {
        name: 'Fournil Didot',
        arrondissement: '14e',
        google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
      },
      distanceKm: 0.65
    }
  ];
  const html = renderNearbyResults(sorted);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14区/);
  assert.match(html, /650m/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});

test('renderYearTabs marks the active year and lists all years', () => {
  const contestResults = [
    { year: 2026, rankings: [] },
    { year: 2025, rankings: [] }
  ];
  const html = renderYearTabs(contestResults, 2026);
  assert.match(html, /class="tab-btn active" data-year="2026"/);
  assert.match(html, /data-year="2025"/);
});

test('renderYearPanel shows up to 5 ranks with map link, and notes omitted ranks', () => {
  const manyShops = Array.from({ length: 8 }, (_, i) => ({
    id: `shop-${i + 1}`,
    name: `Shop ${i + 1}`,
    arrondissement: '14e',
    google_maps_url: `https://www.google.com/maps/search/?api=1&query=0,${i}`
  }));
  const result = {
    year: 2026,
    rankings: manyShops.map((s, i) => ({ rank: i + 1, shop_id: s.id, winner_name: null })),
    source_url: 'https://presse.paris.fr/example'
  };
  const html = renderYearPanel(result, manyShops);
  assert.match(html, /Shop 1/);
  assert.match(html, /Shop 5/);
  assert.doesNotMatch(html, /Shop 6/);
  assert.match(html, /他 3 件/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
});

test('renderYearPanel shows winner_name and no map link when shop_id is unknown', () => {
  const result = {
    year: 2010,
    rankings: [{ rank: 1, shop_id: null, winner_name: 'Georges Doucet' }],
    source_url: 'https://presse.paris.fr/example'
  };
  const html = renderYearPanel(result, []);
  assert.match(html, /Georges Doucet/);
  assert.doesNotMatch(html, /google\.com\/maps/);
});

test('renderContestDetail returns meta, tabs for every year, and a panel for the latest year', () => {
  const contest = { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', frequency: '年1回(例年2月頃)' };
  const twoYearResults = [
    ...results,
    {
      contest_id: 'baguette',
      year: 2025,
      rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }],
      source_url: 'https://presse.paris.fr/example-2025'
    }
  ];

  const { meta, tabs, panel } = renderContestDetail(contest, twoYearResults, shops);
  assert.match(meta, /パリ市/);
  assert.match(meta, /年1回/);
  assert.match(tabs, /data-year="2026"/);
  assert.match(tabs, /data-year="2025"/);
  assert.match(panel, /Fournil Didot/);
});
