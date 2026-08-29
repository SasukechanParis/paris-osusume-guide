import { formatDistance } from './distance.js';

const ARRONDISSEMENT_JA = {
  '1er': '1区',
  '2e': '2区',
  '3e': '3区',
  '4e': '4区',
  '5e': '5区',
  '6e': '6区',
  '7e': '7区',
  '8e': '8区',
  '9e': '9区',
  '10e': '10区',
  '11e': '11区',
  '12e': '12区',
  '13e': '13区',
  '14e': '14区',
  '15e': '15区',
  '16e': '16区',
  '17e': '17区',
  '18e': '18区',
  '19e': '19区',
  '20e': '20区',
  'Hauts-de-Seine': 'オー・ド・セーヌ県(パリ郊外)',
  'Seine-Saint-Denis': 'セーヌ・サン・ドニ県(パリ郊外)',
  'Val-de-Marne': 'ヴァル・ド・マルヌ県(パリ郊外)'
};

function arrondissementLabel(arr) {
  return ARRONDISSEMENT_JA[arr] ?? arr;
}

export function renderProgramList(contests) {
  const iconByCategory = {
    baguette: 'assets/illustrations/baguette.jpg',
    croissant: 'assets/illustrations/croissant.jpg'
  };
  return contests
    .map(
      (c) => `
    <div class="program-row">
      <img class="program-icon" src="${iconByCategory[c.category] ?? ''}" alt="${c.category}">
      <div>
        <p class="program-name">${c.name}</p>
        <p class="program-meta">主催: ${c.organizer}</p>
      </div>
      <div class="program-date">${c.next_edition_date ?? '次回未発表'}<span class="status">下書き待ち</span></div>
    </div>`
    )
    .join('');
}

function rankingRowLabel(r, shopById) {
  const shop = r.shop_id ? shopById.get(r.shop_id) : null;
  if (shop) {
    return {
      name: shop.name,
      meta: arrondissementLabel(shop.arrondissement),
      mapLink: shop.google_maps_url
        ? `<a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>`
        : ''
    };
  }
  return {
    name: r.winner_name ?? '受賞者不明',
    meta: '店舗情報は未確認です',
    mapLink: ''
  };
}

export function renderRankingGroups(results, shops, contests) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  return results
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const label = rankingRowLabel(r, shopById);
          return `
        <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
          <span class="rank-num">${r.rank}</span>
          <div>
            <p class="ranking-shop-name">${label.name}</p>
            <p class="ranking-arr">${label.meta}</p>
          </div>
          <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
        </div>`;
        })
        .join('');
      return `
    <div class="ranking-group">
      <a class="ranking-group-label" href="contest.html?id=${contest.id}">${contest.name}</a>
      ${rows}
    </div>`;
    })
    .join('');
}

export function renderNearbyResults(sorted) {
  return sorted
    .map(
      ({ shop, distanceKm }) => `
    <div class="nearby-card">
      <div>
        <p class="nearby-card-name">${shop.name}</p>
        <p class="nearby-card-meta">${arrondissementLabel(shop.arrondissement)}</p>
      </div>
      <div class="nearby-distance">${formatDistance(distanceKm)}</div>
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで経路を見る</a>
    </div>`
    )
    .join('');
}

const MAX_RANK_SHOWN = 5;

export function renderYearTabs(contestResults, activeYear) {
  return contestResults
    .map(
      (result) => `<button class="tab-btn${result.year === activeYear ? ' active' : ''}" data-year="${result.year}" type="button">${result.year}</button>`
    )
    .join('');
}

export function renderYearPanel(result, shops) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const rows = result.rankings
    .slice(0, MAX_RANK_SHOWN)
    .map((r) => {
      const label = rankingRowLabel(r, shopById);
      return `
    <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
      <span class="rank-num">${r.rank}</span>
      <div>
        <p class="ranking-shop-name">${label.name}</p>
        <p class="ranking-arr">${label.meta}</p>
      </div>
      ${label.mapLink}
    </div>`;
    })
    .join('');
  const omittedCount = result.rankings.length - MAX_RANK_SHOWN;
  const omittedNote = omittedCount > 0 ? `<p class="section-note">他 ${omittedCount} 件は出典でご確認ください</p>` : '';

  return `
    ${rows}
    ${omittedNote}
    <a class="ranking-source" href="${result.source_url}">出典 ↗</a>`;
}

export function renderContestDetail(contest, results, shops) {
  const contestResults = results
    .filter((r) => r.contest_id === contest.id)
    .sort((a, b) => b.year - a.year);

  if (contestResults.length === 0) {
    return { meta: `主催: ${contest.organizer} ・ 開催頻度: ${contest.frequency}`, tabs: '', panel: '' };
  }

  return {
    meta: `主催: ${contest.organizer} ・ 開催頻度: ${contest.frequency}`,
    tabs: renderYearTabs(contestResults, contestResults[0].year),
    panel: renderYearPanel(contestResults[0], shops)
  };
}