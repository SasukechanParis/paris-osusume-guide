import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderProgramList, renderRankingGroups, renderShopList, renderNearbyResults, renderContestDetail } from '../js/render.js';

const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', category: 'baguette', next_edition_date: null }
];

test('renderProgramList includes contest icon image', () => {
  const html = renderProgramList(contests);
  assert.match(html, /baguette\.jpg/);
});
const shops = [
  { id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e' }
];
const results = [
  {
    contest_id: 'baguette',
    year: 2026,
    rankings: [{ rank: 1, shop_id: 'fournil-didot' }],
    source_url: 'https://presse.paris.fr/example'
  }
];

test('renderProgramList includes contest name and organizer', () => {
  const html = renderProgramList(contests);
  assert.match(html, /Grand Prix de la Baguette/);
  assert.match(html, /パリ市/);
});

test('renderRankingGroups includes shop name, rank, source link, and contest detail link', () => {
  const html = renderRankingGroups(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14e/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
  assert.match(html, /href="contest\.html\?id=baguette"/);
});

test('renderShopList includes shop name, address, and google maps link', () => {
  const shops = [
    {
      id: 'fournil-didot',
      name: 'Fournil Didot',
      address: '103 rue Didot, 75014 Paris',
      arrondissement: '14e',
      description: '低温発酵が特徴のバゲット専門店。',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
    }
  ];
  const html = renderShopList(shops);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /低温発酵/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});

test('renderNearbyResults shows shop name, formatted distance, and maps link', () => {
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
  assert.match(html, /650m/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});

test('renderContestDetail shows organizer, frequency, and all rankings for the contest', () => {
  const contest = { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', frequency: '年1回(例年2月頃)' };
  const results = [
    {
      contest_id: 'baguette',
      year: 2026,
      rankings: [{ rank: 1, shop_id: 'fournil-didot' }],
      source_url: 'https://presse.paris.fr/example'
    }
  ];
  const shops = [{ id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e' }];

  const html = renderContestDetail(contest, results, shops);
  assert.match(html, /パリ市/);
  assert.match(html, /年1回/);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /2026/);
});
