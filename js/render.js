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

export function renderRankingGroups(results, shops, contests) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  return results
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const shop = shopById.get(r.shop_id);
          return `
        <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
          <span class="rank-num">${r.rank}</span>
          <div>
            <p class="ranking-shop-name">${shop.name}</p>
            <p class="ranking-arr">${shop.arrondissement}</p>
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

export function renderShopList(shops) {
  return shops
    .map(
      (shop) => `
    <div class="shop-card">
      <p class="shop-name">${shop.name}</p>
      <p class="shop-meta">${shop.arrondissement} ・ ${shop.address}</p>
      ${shop.description ? `<p class="shop-desc">${shop.description}</p>` : ''}
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>
    </div>`
    )
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
          const shop = shopById.get(r.shop_id);
          return `<li>${r.rank}位: ${shop.name}(${shop.arrondissement})</li>`;
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
