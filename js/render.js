import { formatDistance } from './distance.js';
import { buildDirectionsUrl } from './maps-links.js';
import { factsHtml } from './facts-view.js';
import { escapeHtml } from './html.js';
import { cardOptions } from './card-options.js';

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

// 「お店を見る」(Googleマップ検索)と「経路」(Googleマップ経路)は別のボタンにする。
// 出典リンクなど追加要素は extra に渡す。写真がなくても成立するカードの操作行。
export function renderSaveButton(uid) {
  return `<button type="button" class="btn btn-outline save-btn" data-save="${uid}" aria-pressed="false"><svg class="save-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/></svg><span class="save-label">保存</span></button>`;
}

// 「情報が違っていた」。押すと報告文をつくる画面が開く(送信はしない)。日本語版のシェルが有効にしたときだけ出す
export function renderReportButton(place) {
  return `<button type="button" class="report-btn" data-report="${escapeHtml(place.uid)}" data-report-name="${escapeHtml(place.name)}">情報が違っていた</button>`;
}

// place.uid がある(=保存できる)場所には「保存」ボタンを足す。save:false で省略できる(保存ページ自身)
export function renderCardActions(place, { origin = null, extra = '', save = true, report = cardOptions.report } = {}) {
  const view = place.google_maps_url
    ? `<a class="btn btn-outline shop-map-link" href="${place.google_maps_url}" target="_blank" rel="noopener">Googleマップで見る</a>`
    : '';
  const routeUrl = buildDirectionsUrl(place, origin);
  const route = routeUrl
    ? `<a class="btn btn-outline route-link" href="${routeUrl}" target="_blank" rel="noopener" data-route>経路を見る</a>`
    : '';
  const saveButton = save && place.uid ? renderSaveButton(place.uid) : '';
  const reportButton = report && place.uid ? renderReportButton(place) : '';
  if (!view && !route && !extra && !saveButton && !reportButton) return '';
  return `<div class="card-actions">${saveButton}${route}${view}${extra}${reportButton}</div>`;
}

const SOURCE_LABEL = {
  sasuke: 'さすけ',
  guest: '先輩カップル'
};

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
        ? `<a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで見る</a>`
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

export function renderUpdatesList(updates, limit = 5) {
  return [...updates]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
    .map(
      (u) => `
    <li class="updates-item">
      <span class="updates-date">${u.date}</span>
      ${u.link ? `<a class="updates-link" href="${u.link}">${u.text}</a>` : `<span class="updates-link">${u.text}</span>`}
    </li>`
    )
    .join('');
}

export function renderTrending(trending) {
  return trending
    .map(
      (t) => `
    <article class="trending-card place-card"${t.uid ? ` id="place-${t.uid}"` : ''}>
      <p class="trending-name">${t.name}</p>
      <p class="trending-meta">${arrondissementLabel(t.arrondissement)}</p>
      <p class="trending-desc place-desc">${t.description}</p>
      ${renderCardActions(t, { extra: `<a class="ranking-source" href="${t.source_url}">出典 ↗</a>` })}
    </article>`
    )
    .join('');
}

const RECOMMENDATION_STATUS_LABEL = {
  recommended: 'おすすめ',
  curious: '気になる(未訪問)'
};

// options.extra(item): カードの操作行に足すHTML(ホテルの「比較に追加」など)。item.facts があれば確認済みの条件も出す
export function renderRecommendationList(items, { extra = () => '' } = {}) {
  return items
    .map(
      (item) => `
    <article class="trending-card place-card"${item.uid ? ` id="place-${item.uid}"` : ''}>
      ${item.photo_url ? `<img class="trending-photo" src="${item.photo_url}" alt="${item.name}" loading="lazy" decoding="async">` : ''}
      <div class="trending-name-row">
        <p class="trending-name">${item.name}</p>
        ${item.status ? `<span class="status-badge status-badge-${item.status}">${RECOMMENDATION_STATUS_LABEL[item.status] ?? item.status}</span>` : ''}
      </div>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address}</p>
      ${item.description ? `<p class="trending-desc place-desc">${item.description}</p>` : ''}
      ${factsHtml(item)}
      ${item.submitted_by ? `<p class="trending-meta">投稿: ${item.submitted_by}さん</p>` : ''}
      ${renderCardActions(item, { extra: extra(item) })}
    </article>`
    )
    .join('');
}

export function renderMichelinList(items) {
  return [...items]
    .sort((a, b) => b.stars - a.stars)
    .map((item) => {
      const metaParts = [arrondissementLabel(item.arrondissement)];
      if (item.address) metaParts.push(item.address + (item.hotel ? ` (${item.hotel})` : ''));
      return `
    <article class="trending-card place-card"${item.uid ? ` id="place-${item.uid}"` : ''}>
      <div class="trending-name-row">
        <p class="trending-name">${item.name}</p>
        <span class="status-badge status-badge-michelin">${'★'.repeat(item.stars)}</span>
        ${item.genre ? `<span class="status-badge status-badge-genre">${item.genre}</span>` : ''}
      </div>
      <p class="trending-meta">${metaParts.join(' ・ ')}</p>
      ${item.description ? `<p class="trending-desc place-desc">${item.description}</p>` : ''}
      ${renderCardActions(item, { extra: `<a class="ranking-source" href="${item.source_url}">出典 ↗</a>` })}
    </article>`;
    })
    .join('');
}

export function renderFleaMarketList(items) {
  return items
    .map(
      (item) => `
    <article class="trending-card place-card"${item.uid ? ` id="place-${item.uid}"` : ''}>
      <p class="trending-name">${item.name}</p>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address}</p>
      <p class="trending-meta">開催: ${item.hours}</p>
      <p class="trending-meta">アクセス: ${item.access}</p>
      ${item.description ? `<p class="trending-desc place-desc">${item.description}</p>` : ''}
      ${item.caution ? `<p class="shop-note">⚠ ${item.caution}</p>` : ''}
      ${renderCardActions(item, { extra: `<a class="ranking-source" href="${item.source_url}">${item.source_label ?? '出典 ↗'}</a>` })}
    </article>`
    )
    .join('');
}

export function renderPassageList(items) {
  return items
    .map(
      (item) => `
    <article class="trending-card place-card"${item.uid ? ` id="place-${item.uid}"` : ''}>
      <p class="trending-name">${item.name}</p>
      <p class="trending-meta">${arrondissementLabel(item.arrondissement)} ・ ${item.address} ・ ${item.year}築</p>
      ${item.description ? `<p class="trending-desc place-desc">${item.description}</p>` : ''}
      ${item.caution ? `<p class="shop-note">${item.caution}</p>` : ''}
      ${renderCardActions(item)}
    </article>`
    )
    .join('');
}

// origin: { lat, lng, kind } 利用者が選んだ検索の起点。経路ボタンのoriginに使う(GPSはURLに載せない)。
export function renderNearbyResults(sorted, options = {}) {
  const { winCounts, linkToShop = false, origin = null } = options;
  return sorted
    .map(({ shop, distanceKm }) => {
      const nameHtml = linkToShop
        ? `<a class="ranking-shop-link" href="shop.html?id=${shop.id}">${shop.name}</a>${winBadge(winCounts, shop.id)}`
        : shop.name;
      const statusBadge = shop.status
        ? `<span class="status-badge status-badge-${shop.status}">${RECOMMENDATION_STATUS_LABEL[shop.status] ?? shop.status}</span>`
        : '';
      const sourceBadge = SOURCE_LABEL[shop.source]
        ? `<span class="status-badge status-badge-source">${SOURCE_LABEL[shop.source]}</span>`
        : '';
      const metaParts = [arrondissementLabel(shop.arrondissement)];
      if (shop.address) metaParts.push(shop.address);
      return `
    <article class="nearby-card place-card">
      <div>
        <p class="nearby-card-name">${nameHtml}</p>
        <p class="nearby-card-badges">${statusBadge}${sourceBadge}</p>
        <p class="nearby-card-meta">${metaParts.join(' ・ ')}</p>
        ${shop.description ? `<p class="shop-note place-desc">${shop.description}</p>` : ''}
      </div>
      <div class="nearby-distance"><span class="nearby-distance-value">${formatDistance(distanceKm)}</span><span class="nearby-distance-note">直線距離</span></div>
      ${renderCardActions(shop, { origin })}
    </article>`;
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
    ? `<a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで見る</a>`
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