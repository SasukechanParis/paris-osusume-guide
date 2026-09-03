import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderRankingGroups,
  renderNearbyResults,
  renderContestDetail,
  renderYearTabs,
  renderYearPanel,
  renderTrending,
  renderRecommendationList,
  renderMichelinList,
  buildShopWinCounts,
  renderShopDetail,
  renderFleaMarketList,
  renderPassageList
} from '../js/render.js';

const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', category: 'baguette', next_edition_date: null }
];

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

test('renderRankingGroups includes shop name, arrondissement in Japanese, source link, map link, and contest detail link', () => {
  const html = renderRankingGroups(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14区/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
  assert.match(html, /href="contest\.html\?id=baguette"/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
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
  assert.doesNotMatch(html, /shop\.html\?id=/);
});

test('renderNearbyResults links shop name to shop.html only when linkToShop is true', () => {
  const sorted = [
    {
      shop: {
        id: 'fournil-didot',
        name: 'Fournil Didot',
        arrondissement: '14e',
        google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
      },
      distanceKm: 0.65
    }
  ];
  const html = renderNearbyResults(sorted, { linkToShop: true });
  assert.match(html, /href="shop\.html\?id=fournil-didot"/);
});

test('renderNearbyResults shows a status badge and address when the item has them', () => {
  const sorted = [
    {
      shop: {
        name: 'Le Petit Bistro',
        arrondissement: '9e',
        address: '12 Rue Cadet, 75009 Paris',
        status: 'recommended',
        description: '雰囲気が良い',
        google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Le%20Petit%20Bistro'
      },
      distanceKm: 1.2
    }
  ];
  const html = renderNearbyResults(sorted);
  assert.match(html, /おすすめ/);
  assert.match(html, /12 Rue Cadet, 75009 Paris/);
  assert.match(html, /雰囲気が良い/);
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

test('renderTrending shows name, arrondissement in Japanese, description, map link, and source link', () => {
  const trending = [
    {
      id: 'cedric-grolet-opera',
      name: 'Cédric Grolet Opéra',
      arrondissement: '2e',
      description: 'Instagramフォロワー1300万人超で、開店前から連日行列ができている。',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8679572,2.3331957',
      source_url: 'https://numero.jp/yuriyamano-83/'
    }
  ];
  const html = renderTrending(trending);
  assert.match(html, /Cédric Grolet Opéra/);
  assert.match(html, /2区/);
  assert.match(html, /1300万人超/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8679572,2\.3331957"/);
  assert.match(html, /href="https:\/\/numero\.jp\/yuriyamano-83\/"/);
});

test('renderRecommendationList shows name, address, description, status badge, and map link when present', () => {
  const items = [
    {
      id: 'example-restaurant',
      name: 'Example Restaurant',
      address: '1 rue Example, 75001 Paris',
      arrondissement: '1er',
      status: 'recommended',
      description: 'むんたのコメント',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.86,2.34'
    }
  ];
  const html = renderRecommendationList(items);
  assert.match(html, /Example Restaurant/);
  assert.match(html, /1区/);
  assert.match(html, /むんたのコメント/);
  assert.match(html, /おすすめ/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.86,2\.34"/);
});

test('renderRecommendationList shows the curious status label', () => {
  const items = [
    {
      id: 'example-curious',
      name: 'Curious Restaurant',
      address: '2 rue Example, 75002 Paris',
      arrondissement: '2e',
      status: 'curious',
      description: null,
      google_maps_url: null
    }
  ];
  const html = renderRecommendationList(items);
  assert.match(html, /気になる/);
});

test('renderRecommendationList returns empty string for an empty list', () => {
  assert.equal(renderRecommendationList([]), '');
});

test('renderRecommendationList shows the submitter credit when present', () => {
  const items = [
    {
      id: 'hotel-volney-opera',
      name: 'Hôtel Volney Opéra',
      address: '11 Rue Volney, 75002 Paris',
      arrondissement: '2e',
      description: 'バスタブ付き',
      submitted_by: 'ゆりか',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.86,2.33'
    }
  ];
  const html = renderRecommendationList(items);
  assert.match(html, /投稿: ゆりかさん/);
});

test('renderMichelinList shows name, stars as filled marks, hotel, address, map link, and sorts 3-star before 2-star', () => {
  const items = [
    {
      id: 'two-star-example',
      name: 'Two Star Example',
      hotel: null,
      stars: 2,
      arrondissement: '8e',
      address: '1 rue Example, 75008 Paris',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.87,2.30',
      source_url: 'https://mesinfos.fr/example'
    },
    {
      id: 'three-star-example',
      name: 'Three Star Example',
      hotel: 'Hôtel Example',
      stars: 3,
      arrondissement: '1er',
      address: '2 rue Example, 75001 Paris',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.86,2.34',
      description: 'シェフExampleによる創作フレンチ',
      source_url: 'https://mesinfos.fr/example'
    }
  ];
  const html = renderMichelinList(items);
  assert.match(html, /Three Star Example[\s\S]*Two Star Example/);
  assert.match(html, /★★★/);
  assert.match(html, /Hôtel Example/);
  assert.match(html, /シェフExampleによる創作フレンチ/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.86,2\.34"/);
  assert.match(html, /href="https:\/\/mesinfos\.fr\/example"/);
});

test('renderMichelinList shows a genre badge and skips address/description when absent (one-star lighter template)', () => {
  const items = [
    {
      id: 'one-star-example',
      name: 'One Star Example',
      hotel: null,
      stars: 1,
      arrondissement: '9e',
      address: null,
      genre: 'フレンチ',
      description: null,
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=One%20Star%20Example%2C%20Paris',
      source_url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Paris'
    }
  ];
  const html = renderMichelinList(items);
  assert.match(html, /One Star Example/);
  assert.match(html, /★(?!★)/);
  assert.match(html, /フレンチ/);
  assert.match(html, /9区/);
  assert.doesNotMatch(html, /trending-desc/);
});

test('buildShopWinCounts counts appearances per shop across all contests and years', () => {
  const multiResults = [
    { contest_id: 'baguette', year: 2025, rankings: [{ rank: 1, shop_id: 'shop-a' }, { rank: 2, shop_id: 'shop-b' }] },
    { contest_id: 'baguette', year: 2024, rankings: [{ rank: 3, shop_id: 'shop-a' }] },
    { contest_id: 'croissant', year: 2024, rankings: [{ rank: 1, shop_id: 'shop-a' }, { rank: 5, shop_id: null }] }
  ];
  const counts = buildShopWinCounts(multiResults);
  assert.equal(counts.get('shop-a').total, 3);
  assert.equal(counts.get('shop-a').byContest.get('baguette'), 2);
  assert.equal(counts.get('shop-a').byContest.get('croissant'), 1);
  assert.equal(counts.get('shop-b').total, 1);
  assert.equal(counts.has('shop-c'), false);
});

test('renderRankingGroups links shop names to shop.html and shows a win badge for repeat winners', () => {
  const multiShops = [
    { id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e', google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129' }
  ];
  const multiResults = [
    { contest_id: 'baguette', year: 2026, rankings: [{ rank: 1, shop_id: 'fournil-didot', winner_name: null }], source_url: 'https://presse.paris.fr/example' }
  ];
  const winCounts = buildShopWinCounts([
    ...multiResults,
    { contest_id: 'croissant', year: 2024, rankings: [{ rank: 2, shop_id: 'fournil-didot' }] }
  ]);
  const html = renderRankingGroups(multiResults, multiShops, contests, winCounts);
  assert.match(html, /href="shop\.html\?id=fournil-didot"/);
  assert.match(html, /通算2回入賞/);
});

test('renderShopDetail lists every contest appearance sorted by year and flags repeat winners', () => {
  const shop = {
    id: 'fournil-didot',
    name: 'Fournil Didot',
    arrondissement: '14e',
    address: '103 Rue Didot, 75014 Paris',
    description: null,
    google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
  };
  const multiResults = [
    { contest_id: 'baguette', year: 2026, rankings: [{ rank: 1, shop_id: 'fournil-didot' }], source_url: 'https://presse.paris.fr/2026' },
    { contest_id: 'baguette', year: 2020, rankings: [{ rank: 4, shop_id: 'fournil-didot' }], source_url: 'https://presse.paris.fr/2020' },
    { contest_id: 'baguette', year: 2021, rankings: [{ rank: 9, shop_id: 'other-shop' }], source_url: 'https://presse.paris.fr/2021' }
  ];
  const detail = renderShopDetail(shop, multiResults, contests);
  assert.equal(detail.name, 'Fournil Didot');
  assert.match(detail.winSummary, /通算2回入賞/);
  assert.match(detail.rows, /2026[\s\S]*2020/);
  assert.doesNotMatch(detail.rows, /other-shop/);
});

test('renderFleaMarketList shows name, hours, access, description, caution note, and links', () => {
  const fleaMarkets = [
    {
      id: 'puces-de-montreuil',
      name: 'Marché aux Puces de la Porte de Montreuil',
      arrondissement: '20e',
      address: 'Avenue du Professeur André Lemierre, 75020 Paris',
      hours: '土日月 7:00-19:30',
      access: 'メトロ9号線 ポルト・ド・モントルイユ駅',
      description: '正直なところ「うーん」というのが本音',
      caution: '日中の明るい時間帯に訪れるのが無難',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Puces%20de%20Montreuil',
      source_url: 'https://www.paris.fr/lieux/marche-aux-puces-de-la-porte-de-montreuil-4517',
      source_label: 'パリ市公式サイト(paris.fr)'
    },
    {
      id: 'puces-de-vanves',
      name: 'Marché aux puces de la Porte de Vanves',
      arrondissement: '14e',
      address: 'Rue du Colonel Monteil, 75014 Paris',
      hours: '土 7:00-14:00 ・ 日 7:30-19:30',
      access: 'メトロ13号線 ポルト・ド・ヴァンヴ駅',
      description: 'こぢんまりとした古物・アンティーク市',
      caution: null,
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Puces%20de%20Vanves',
      source_url: 'https://www.paris.fr/lieux/marche-aux-puces-de-la-porte-de-vanves-4518',
      source_label: 'パリ市公式サイト(paris.fr)'
    }
  ];
  const html = renderFleaMarketList(fleaMarkets);
  assert.match(html, /Marché aux Puces de la Porte de Montreuil/);
  assert.match(html, /20区/);
  assert.match(html, /土日月 7:00-19:30/);
  assert.match(html, /ポルト・ド・モントルイユ駅/);
  assert.match(html, /うーん/);
  assert.match(html, /日中の明るい時間帯に訪れるのが無難/);
  assert.match(html, /パリ市公式サイト\(paris\.fr\)/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Puces%20de%20Montreuil"/);
  assert.doesNotMatch(html.split('Marché aux puces de la Porte de Vanves')[1], /shop-note/);
});

test('renderPassageList shows name, year, description, optional caution note, and maps link', () => {
  const passages = [
    {
      id: 'galerie-vivienne',
      name: 'Galerie Vivienne',
      arrondissement: '2e',
      address: '4 Rue des Petits Champs, 75002 Paris',
      year: '1823',
      description: 'パリで最も優雅とされるパッサージュ',
      google_maps_url: 'https://maps.app.goo.gl/JpZjN11DbsVPW6oE8'
    },
    {
      id: 'passage-du-ponceau',
      name: 'Passage du Ponceau',
      arrondissement: '2e',
      address: '212 Rue Saint-Denis, 75002 Paris',
      year: '1826',
      description: 'ガラス屋根はアクリル板に置き換えられている',
      caution: 'わざわざ時間を割いて行くほどではないかもしれません',
      google_maps_url: 'https://maps.app.goo.gl/AF3XyBfhcThXnZKn6'
    }
  ];
  const html = renderPassageList(passages);
  assert.match(html, /Galerie Vivienne/);
  assert.match(html, /2区/);
  assert.match(html, /1823築/);
  assert.match(html, /パリで最も優雅とされるパッサージュ/);
  assert.match(html, /href="https:\/\/maps\.app\.goo\.gl\/JpZjN11DbsVPW6oE8"/);
  assert.match(html, /わざわざ時間を割いて行くほどではないかもしれません/);
  assert.doesNotMatch(html.split('Passage du Ponceau')[0], /shop-note/);
});
