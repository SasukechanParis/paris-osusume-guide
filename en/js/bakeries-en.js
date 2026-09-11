// Renders /en/favorite-bakeries-paris.html from en/data/bakeries-en.json —
// Sasuke's own everyday-favorite bakeries, ported from
// data/recommendations.json with his approval (see docs/en-site-plan.md,
// "Round 2"). Separate from the official competition winners covered by
// paris-bakery-awards.html / best-baguettes-in-paris.html /
// best-croissants-in-paris.html.
//
// Self-contained: no dependency on the Japanese site's js/data.js or
// js/render.js (same convention as en/js/hotels-en.js).

import { arrondissementLabel } from './arrondissement-labels.js';
import { setupNearbySearchEn } from './nearby-search-en.js';

const STATUS_LABELS = {
  recommended: 'Recommended by Sasuke',
  curious: "On Sasuke's list to try"
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadItems() {
  const res = await fetch('data/bakeries-en.json');
  if (!res.ok) throw new Error(`Failed to load bakeries-en.json: ${res.status}`);
  return res.json();
}

function sortByStatus(items) {
  const order = { recommended: 0, curious: 1 };
  return [...items].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
}

function renderCard(item) {
  const badge = item.status
    ? `<span class="status-badge status-badge-${escapeHtml(item.status)}">${escapeHtml(STATUS_LABELS[item.status] ?? item.status)}</span>`
    : '';
  return `
    <div class="trending-card">
      <div class="trending-name-row">
        <p class="trending-name">${escapeHtml(item.name)}</p>
        ${badge}
      </div>
      <p class="trending-meta">${escapeHtml(arrondissementLabel(item.arrondissement))} &middot; ${escapeHtml(item.address)}</p>
      ${item.description ? `<p class="trending-desc">${escapeHtml(item.description)}</p>` : ''}
      ${item.googleMapsUrl ? `<a class="btn btn-outline shop-map-link" href="${escapeHtml(item.googleMapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}
    </div>`;
}

function renderList(items) {
  return sortByStatus(items).map(renderCard).join('');
}

function toNearbyItem(item) {
  return {
    name: item.name,
    arrondissement: arrondissementLabel(item.arrondissement),
    address: item.address,
    googleMapsUrl: item.googleMapsUrl,
    lat: item.lat,
    lng: item.lng
  };
}

async function init() {
  const listEl = document.getElementById('bakeries-list');
  if (!listEl) return;

  let items;
  try {
    items = await loadItems();
  } catch (err) {
    listEl.innerHTML = '<p class="trending-desc">This list is temporarily unavailable. Please try again shortly.</p>';
    console.error(err);
    return;
  }

  listEl.innerHTML = renderList(items);
  setupNearbySearchEn(items.map(toNearbyItem));

  if (window.goatcounter && window.goatcounter.bind_events) {
    window.goatcounter.bind_events();
  }
}

init();
