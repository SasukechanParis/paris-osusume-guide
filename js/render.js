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

export function arrondissementLabel(arr) {
  return ARRONDISSEMENT_JA[arr] ?? arr;
}

export function buildShopWinCounts(results) {
  const winCounts = new Map();
  for (const result of results) {
    for (const ranking of result.rankings) {
      if (!ranking.shop_id) continue;
      const entry = winCounts.get(ranking.shop_id) ?? { total: 0, byContest: new Map() };
      entry.total += 1;
      entry.byContest.set(result.contest_id, (entry.byContest.get(result.contest_id) ?? 0) + 1);
      winCounts.set(ranking.shop_id, entry);
    }
  }
  return winCounts;
}

function winBadge(winCounts, shopId) {
  const entry = winCounts?.get(shopId);
  if (!entry || entry.total <= 1) return '';
  return `<span class="status-badge status-badge-wins">通算${entry.total}回入賞</span>`;
}

function rankingRowLabel(r, shopById, winCounts) {
  const shop = r.shop_id ? shopById.get(r.shop_id) : null;
  if (shop) {
    return {
      name: `<a class="ranking-shop-link" href="shop.html?id=${shop.id}">${shop.name}</a>${winBadge(winCounts, shop.id)}`,
      meta: arrondissementLabel(shop.arrondissement),
      note: shop.description ? `<p class="shop-note">${shop.description}</p>` : '',
      mapLink: shop.google_maps_url
        ? `<a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>`
        : ''
    };
  }
  return {
    name: r.winner_name ?? '受賞者不明',
    meta: '店舗情報は未確認です',
    note: '',
    mapLink: ''
  };
}

export function renderRankingGroups(results, shops, contests, winCounts) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  return results
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const label = rankingRowLabel(r, shopById, winCounts);
          return `
        <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
          <span class="rank-num">${r.rank}</span>
          <div>
            <p class="ranking-shop-name">${label.name}</p>
            <p class="ranking-arr">${label.meta}</p>
            ${label.note}
            <div class="ranking-links">
              ${label.mapLink}
              <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
            </div>
          </div>
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

export function renderTrending(trending) {
  return trending
    .map(
      (t) => `
    <div class="trending-card">
      <p class="trending-name">${t.name}</p>
      <p class="trending-meta">${arrondissementLabel(t.arrondissement)}</p>
      <p class="trending-desc">${t.description}</p>
      <div class="ranking-links">
        <a class="btn btn-outline shop-map-link" href="${t.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>
        <a class="ranking-source" href="${t.source_url}">出典 ↗</a>
      </div>
    </div>`
    )
    .join('');
}

const RECOMMENDATION_STATUS_LABEL = {
  recommended: 'おすすめ',
  curious: '気になる(未訪問)'
};

export function renderRecommendationList(items) {
  return items
    .map(
      (item) => `
    <div class="trending-card">
      <div class="trending-name-row">
        <p class="trending-name">${item.name}</p>
        ${item.status ? `<span class="status-badge status-badge-${item.status}">${RECOMMENDATION_STATUS_LABEL[item.status] ?? item.status}</span>` : ''}
      </div>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address}</p>
      ${item.description ? `<p class="trending-desc">${item.description}</p>` : ''}
      ${item.google_maps_url ? `<a class="btn btn-outline shop-map-link" href="${item.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>` : ''}
    </div>`
    )
    .join('');
}

export function renderMichelinList(items) {
  return [...items]
    .sort((a, b) => b.stars - a.stars)
    .map(
      (item) => `
    <div class="trending-card">
      <div class="trending-name-row">
        <p class="trending-name">${item.name}</p>
        <span class="status-badge status-badge-michelin">${'★'.repeat(item.stars)}</span>
      </div>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address}${item.hotel ? ` (${item.hotel})` : ''}</p>
      ${item.description ? `<p class="trending-desc">${item.description}</p>` : ''}
      <div class="ranking-links">
        <a class="btn btn-outline shop-map-link" href="${item.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>
        <a class="ranking-source" href="${item.source_url}">出典 ↗</a>
      </div>
    </div>`
    )
    .join('');
}

export function renderFleaMarketList(items) {
  return items
    .map(
      (item) => `
    <div class="trending-card">
      <p class="trending-name">${item.name}</p>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address}</p>
      <p class="trending-meta">開催: ${item.hours}</p>
      <p class="trending-meta">アクセス: ${item.access}</p>
      ${item.description ? `<p class="trending-desc">${item.description}</p>` : ''}
      ${item.caution ? `<p class="shop-note">⚠ ${item.caution}</p>` : ''}
      <div class="ranking-links">
        <a class="btn btn-outline shop-map-link" href="${item.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>
        <a class="ranking-source" href="${item.source_url}">${item.source_label ?? '出典 ↗'}</a>
      </div>
    </div>`
    )
    .join('');
}

export function renderNearbyResults(sorted, options = {}) {
  const { winCounts, linkToShop = false } = options;
  return sorted
    .map(({ shop, distanceKm }) => {
      const nameHtml = linkToShop
        ? `<a class="ranking-shop-link" href="shop.html?id=${shop.id}">${shop.name}</a>${winBadge(winCounts, shop.id)}`
        : shop.name;
      const statusBadge = shop.status
        ? `<span class="status-badge status-badge-${shop.status}">${RECOMMENDATION_STATUS_LABEL[shop.status] ?? shop.status}</span>`
        : '';
      const metaParts = [arrondissementLabel(shop.arrondissement)];
      if (shop.address) metaParts.push(shop.address);
      return `
    <div class="nearby-card">
      <div>
        <p class="nearby-card-name">${nameHtml} ${statusBadge}</p>
        <p class="nearby-card-meta">${metaParts.join(' ・ ')}</p>
        ${shop.description ? `<p class="shop-note">${shop.description}</p>` : ''}
      </div>
      <div class="nearby-distance">${formatDistance(distanceKm)}</div>
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで経路を見る</a>
    </div>`;
    })
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

export function renderYearPanel(result, shops, winCounts) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const rows = result.rankings
    .slice(0, MAX_RANK_SHOWN)
    .map((r) => {
      const label = rankingRowLabel(r, shopById, winCounts);
      return `
    <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
      <span class="rank-num">${r.rank}</span>
      <div>
        <p class="ranking-shop-name">${label.name}</p>
        <p class="ranking-arr">${label.meta}</p>
        ${label.note}
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

  const winCounts = buildShopWinCounts(results);

  return {
    meta: `主催: ${contest.organizer} ・ 開催頻度: ${contest.frequency}`,
    tabs: renderYearTabs(contestResults, contestResults[0].year),
    panel: renderYearPanel(contestResults[0], shops, winCounts)
  };
}

export function renderShopDetail(shop, results, contests) {
  const contestById = new Map(contests.map((c) => [c.id, c]));
  const appearances = [];
  for (const result of results) {
    for (const ranking of result.rankings) {
      if (ranking.shop_id !== shop.id) continue;
      appearances.push({ contest_id: result.contest_id, year: result.year, rank: ranking.rank, sourceUrl: result.source_url });
    }
  }
  appearances.sort((a, b) => b.year - a.year || a.rank - b.rank);

  const rows = appearances
    .map(
      (a) => `
    <div class="ranking-row">
      <span class="rank-num">${a.rank}</span>
      <div>
        <p class="ranking-shop-name">${contestById.get(a.contest_id)?.name ?? a.contest_id} ${a.year}</p>
        <p class="ranking-arr">${a.rank}位</p>
        <div class="ranking-links">
          <a class="ranking-source" href="${a.sourceUrl}">出典 ↗</a>
        </div>
      </div>
    </div>`
    )
    .join('');

  const meta = `${arrondissementLabel(shop.arrondissement)} ・ ${shop.address}`;
  const note = shop.description ? `<p class="shop-note">${shop.description}</p>` : '';
  const mapLink = shop.google_maps_url
    ? `<a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>`
    : '';

  return {
    name: shop.name,
    meta,
    note,
    mapLink,
    winSummary: appearances.length > 1 ? `通算${appearances.length}回入賞` : '',
    rows
  };
}