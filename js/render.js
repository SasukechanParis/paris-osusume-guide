import { formatDistance } from './distance.js';

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
      meta: shop.arrondissement,
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

export function renderShopList(results, shops, contests) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  const sorted = [...results].sort((a, b) => b.year - a.year);

  return sorted
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const label = rankingRowLabel(r, shopById);
          return `
      <div class="shop-card">
        <p class="shop-name">${label.name}</p>
        <p class="shop-meta">${result.year}年 ${contest.name} ${r.rank}位 ・ ${label.meta}</p>
        ${label.mapLink}
      </div>`;
        })
        .join('');
      return rows;
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
        <p class="nearby-card-meta">${shop.arrondissement}</p>
      </div>
      <div class="nearby-distance">${formatDistance(distanceKm)}</div>
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで経路を見る</a>
    </div>`
    )
    .join('');
}

export function renderContestDetail(contest, results, shops) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestResults = results
    .filter((r) => r.contest_id === contest.id)
    .sort((a, b) => b.year - a.year);

  const yearBlocks = contestResults
    .map((result) => {
      const rows = result.rankings
        .map((r) => {
          const label = rankingRowLabel(r, shopById);
          return `<li>${r.rank}位: ${label.name}(${label.meta})</li>`;
        })
        .join('');
      return `
    <div class="contest-year-block">
      <p class="ranking-group-label">${result.year}年</p>
      <ul>${rows}</ul>
      <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
    </div>`;
    })
    .join('');

  return `
    <p class="program-meta">主催: ${contest.organizer} ・ 開催頻度: ${contest.frequency}</p>
    ${yearBlocks}`;
}
