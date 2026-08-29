import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderProgramList, renderRankingGroups, renderShopList } from '../js/render.js';

const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', category: 'baguette', next_edition_date: null }
];
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

test('renderRankingGroups includes shop name, rank, and source link', () => {
  const html = renderRankingGroups(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14e/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
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
