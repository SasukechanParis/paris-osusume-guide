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
    rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }],
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

test('renderShopList includes shop name, year, rank, and google maps link', () => {
  const shops = [
    {
      id: 'fournil-didot',
      name: 'Fournil Didot',
      arrondissement: '14e',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
    }
  ];
  const results = [
    {
      contest_id: 'baguette',
      year: 2026,
      rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }],
      source_url: 'https://presse.paris.fr/example'
    }
  ];
  const html = renderShopList(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /2026年/);
  assert.match(html, /1位/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});

test('renderShopList shows winner_name and no map link when shop_id is unknown', () => {
  const results = [
    {
      contest_id: 'baguette',
      year: 2010,
      rankings: [{ rank: 1, shop_id: null, winner_name: 'Georges Doucet' }],
      source_url: 'https://presse.paris.fr/example'
    }
  ];
  const html = renderShopList(results, [], contests);
  assert.match(html, /Georges Doucet/);
  assert.doesNotMatch(html, /google\.com\/maps/);
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
      rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }],
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

test('renderContestDetail shows winner_name when shop_id is unknown', () => {
  const contest = { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', frequency: '年1回(例年2月頃)' };
  const results = [
    {
      contest_id: 'baguette',
      year: 1994,
      rankings: [{ rank: 1, shop_id: null, winner_name: 'René Saint-Ouen' }],
      source_url: 'https://en.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris'
    }
  ];

  const html = renderContestDetail(contest, results, []);
  assert.match(html, /René Saint-Ouen/);
});
