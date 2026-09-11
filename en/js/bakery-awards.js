// Shared rendering + data-loading logic for the Bakery & Pastry Awards
// cluster (best-baguettes-in-paris.html, best-croissants-in-paris.html).
//
// Self-contained: does not import the Japanese site's js/data.js or
// js/render.js — this is a separate, English-only surface (see
// en/js/hotels-en.js for the same convention). It reads the same
// underlying JSON that lives in the repo-root /data/ folder
// (results.json, shops.json), just via a relative ../data/ path from /en/.

import { arrondissementLabel } from './arrondissement-labels.js';

// Editorial notes translated from the guide's own French-language
// spot-checks (Google Maps, checked 2026). Only shops with something worth
// flagging — closed, renamed, or an address substitution — appear here.
// Two of these (aux-delices-du-palais, mildo) were independently
// cross-checked via web search on 2026-09-11; both came back ambiguous
// rather than a clean confirm/deny, which is reflected in the wording below.
const SHOP_NOTES = {
  'aux-delices-du-palais':
    'Google Maps lists this bakery as permanently closed (checked 2026), though a few other directories still show it as open. Worth confirming before you make a special trip.',
  'boulangerie-mauvieux':
    'This bakery won under the name "Boulangerie Mauvieux." The same address is now trading as "Boulangerie Gana."',
  'boulangerie-pain-ce':
    "This bakery's Google Maps listing has changed since it won — the name shown here is the current one, which may not match the name used in the original announcement.",
  mildo:
    'At the award address (93 rue du Commerce), Google Maps did not show a bakery by this name at last check — the storefront appeared to have become a different kind of shop. It may have closed or relocated; we could not confirm which.',
  'chez-meunier':
    "This bakery's own shop is in the 19th arrondissement (rue de Crimée), which is out of the way for most visitors — the address listed here is its counter inside Galeries Lafayette Gourmet, easier to reach if you're already sightseeing nearby.",
  'boulangerie-audou':
    'This bakery won under the name "Boulangerie Audou." The same address now trades as "Boulangerie Pâtisserie LNA."'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export function buildWinCounts(results) {
  const winCounts = new Map();
  for (const result of results) {
    for (const ranking of result.rankings) {
      if (!ranking.shop_id) continue;
      winCounts.set(ranking.shop_id, (winCounts.get(ranking.shop_id) ?? 0) + 1);
    }
  }
  return winCounts;
}

function winBadge(winCounts, shopId) {
  const total = winCounts?.get(shopId) ?? 0;
  if (total <= 1) return '';
  return `<span class="status-badge status-badge-wins">${total}&times; on this list</span>`;
}

// Distance bands for the nearest-metro callout. Inside WALK_BAND we show a
// confident walk-time estimate; inside FAR_BAND we still name the station
// but soften the wording so it doesn't read as an easy walk; beyond that we
// say nothing rather than imply a metro connection that isn't really there
// (several shops in this dataset are 5-9km from the nearest station).
const METRO_WALK_BAND_KM = 0.6;
const METRO_FAR_BAND_KM = 1.5;
const WALKING_KMH = 5;

function metroNote(shopId, metroByShopId) {
  const metro = metroByShopId?.get(shopId);
  if (!metro || metro.distanceKm == null) return '';
  const { station, lines, distanceKm } = metro;
  const lineWord = String(lines).includes(',') ? 'Lines' : 'Line';
  if (distanceKm <= METRO_WALK_BAND_KM) {
    const walkMin = Math.max(1, Math.round((distanceKm / WALKING_KMH) * 60));
    return `<p class="ranking-metro">Nearest metro: ${escapeHtml(station)} (${lineWord} ${escapeHtml(String(lines))}) &mdash; about ${walkMin} min walk</p>`;
  }
  if (distanceKm <= METRO_FAR_BAND_KM) {
    return `<p class="ranking-metro">Nearest metro: ${escapeHtml(station)} (${lineWord} ${escapeHtml(String(lines))}), about ${distanceKm.toFixed(1)}km away &mdash; not a short walk</p>`;
  }
  return '';
}

function rankingRowParts(ranking, shopsById, winCounts, metroByShopId) {
  const shop = ranking.shop_id ? shopsById.get(ranking.shop_id) : null;
  if (!shop) {
    return {
      name: ranking.winner_name ? escapeHtml(ranking.winner_name) : 'Bakery not named in the source',
      meta: 'Shop could not be identified from the source record',
      note: '',
      metro: '',
      mapLink: ''
    };
  }
  const note = SHOP_NOTES[shop.id] ? `<p class="shop-note">${escapeHtml(SHOP_NOTES[shop.id])}</p>` : '';
  const mapLink = shop.google_maps_url
    ? `<a class="btn btn-outline shop-map-link" href="${escapeHtml(shop.google_maps_url)}" target="_blank" rel="noopener">Open in Google Maps</a>`
    : '';
  return {
    name: `<span class="ranking-shop-name-text">${escapeHtml(shop.name)}</span>${winBadge(winCounts, shop.id)}`,
    meta: arrondissementLabel(shop.arrondissement),
    note,
    metro: metroNote(shop.id, metroByShopId),
    mapLink
  };
}

function renderRow(ranking, shopsById, winCounts, metroByShopId) {
  const parts = rankingRowParts(ranking, shopsById, winCounts, metroByShopId);
  return `
    <div class="ranking-row${ranking.rank === 1 ? ' is-first' : ''}">
      <span class="rank-num">${ranking.rank}</span>
      <div>
        <p class="ranking-shop-name">${parts.name}</p>
        <p class="ranking-arr">${parts.meta}</p>
        ${parts.note}
        ${parts.metro}
        <div class="ranking-links">${parts.mapLink}</div>
      </div>
    </div>`;
}

export function renderYearTabs(sortedResults, activeYear) {
  return sortedResults
    .map(
      (r) =>
        `<button class="tab-btn${r.year === activeYear ? ' active' : ''}" data-year="${r.year}" type="button">${r.year}</button>`
    )
    .join('');
}

// Renders every ranking row for one year's result, in full — not capped.
// A couple of the flagged shops (closed/renamed/unconfirmed) only appear
// outside a top-5 cut, and that note needs to be visible wherever the shop
// shows up, so both the latest-year section and the year-tabs history use
// this same, uncapped renderer.
export function renderYearResult(result, shopsById, winCounts, metroByShopId) {
  const rows = result.rankings.map((r) => renderRow(r, shopsById, winCounts, metroByShopId)).join('');
  return `
    ${rows}
    <a class="ranking-source" href="${escapeHtml(result.source_url)}" target="_blank" rel="noopener">Source &#8599;</a>`;
}

// Generic page bootstrap shared by best-baguettes.js and best-croissants.js.
// Loads results.json + shops.json once, renders the latest year in full,
// then wires up a year-tabs history browser underneath it.
export async function initContestPage({ contestId, latestElId, yearLabelElId, tabsElId, panelElId }) {
  const [results, shops, metroByShop] = await Promise.all([
    loadJson('../data/results.json'),
    loadJson('../data/shops.json'),
    loadJson('data/shop-nearest-metro.json').catch(() => ({}))
  ]);

  const shopsById = new Map(shops.map((s) => [s.id, s]));
  const metroByShopId = new Map(Object.entries(metroByShop));
  const contestResults = results.filter((r) => r.contest_id === contestId).sort((a, b) => b.year - a.year);
  if (contestResults.length === 0) return;

  const winCounts = buildWinCounts(results);
  const latest = contestResults[0];

  const latestEl = document.getElementById(latestElId);
  if (latestEl) latestEl.innerHTML = renderYearResult(latest, shopsById, winCounts, metroByShopId);

  const yearLabelEl = yearLabelElId ? document.getElementById(yearLabelElId) : null;
  if (yearLabelEl) yearLabelEl.textContent = String(latest.year);

  const tabsEl = document.getElementById(tabsElId);
  const panelEl = document.getElementById(panelElId);
  if (!tabsEl || !panelEl) return;

  tabsEl.innerHTML = renderYearTabs(contestResults, latest.year);
  panelEl.innerHTML = renderYearResult(latest, shopsById, winCounts, metroByShopId);

  tabsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    const year = Number(btn.dataset.year);
    const result = contestResults.find((r) => r.year === year);
    if (!result) return;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    panelEl.innerHTML = renderYearResult(result, shopsById, winCounts, metroByShopId);
  });

  if (window.goatcounter && window.goatcounter.bind_events) {
    window.goatcounter.bind_events();
  }
}
