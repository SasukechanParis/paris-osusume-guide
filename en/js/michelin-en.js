// Renders /en/michelin-star-restaurants-paris.html from the repo-root
// /data/michelin.json (fetched via a relative ../data/ path).
//
// Self-contained: no dependency on the Japanese site's js/data.js or
// js/render.js (same convention as en/js/hotels-en.js). Scope for v1 is
// limited to the 29 two- and three-star entries — the 98 one-star entries
// are intentionally left out (see the page copy for why) and the JSON's
// Japanese-language `description`/`genre` fields are never displayed here.

const ARRONDISSEMENT_LABELS = {
  '1er': '1st arrondissement',
  '2e': '2nd arrondissement',
  '3e': '3rd arrondissement',
  '4e': '4th arrondissement',
  '5e': '5th arrondissement',
  '6e': '6th arrondissement',
  '7e': '7th arrondissement',
  '8e': '8th arrondissement',
  '9e': '9th arrondissement',
  '10e': '10th arrondissement',
  '11e': '11th arrondissement',
  '12e': '12th arrondissement',
  '13e': '13th arrondissement',
  '14e': '14th arrondissement',
  '15e': '15th arrondissement',
  '16e': '16th arrondissement',
  '17e': '17th arrondissement',
  '18e': '18th arrondissement',
  '19e': '19th arrondissement',
  '20e': '20th arrondissement',
  'Hauts-de-Seine': 'Hauts-de-Seine (just outside Paris)',
  'Seine-Saint-Denis': 'Seine-Saint-Denis (just outside Paris)',
  'Val-de-Marne': 'Val-de-Marne (just outside Paris)'
};

function arrondissementLabel(arr) {
  return ARRONDISSEMENT_LABELS[arr] ?? arr;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadMichelin() {
  const res = await fetch('../data/michelin.json');
  if (!res.ok) throw new Error(`Failed to load michelin.json: ${res.status}`);
  return res.json();
}

function renderCard(item) {
  const metaParts = [arrondissementLabel(item.arrondissement)];
  if (item.address) metaParts.push(item.hotel ? `${item.address} (${item.hotel})` : item.address);
  return `
    <div class="trending-card">
      <div class="trending-name-row">
        <p class="trending-name">${escapeHtml(item.name)}</p>
        <span class="status-badge status-badge-michelin">${'&#9733;'.repeat(item.stars)}</span>
      </div>
      <p class="trending-meta">${metaParts.map(escapeHtml).join(' &middot; ')}</p>
      <div class="ranking-links">
        <a class="btn btn-outline shop-map-link" href="${escapeHtml(item.google_maps_url)}" target="_blank" rel="noopener">Open in Google Maps</a>
        ${item.source_url ? `<a class="ranking-source" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">Source &#8599;</a>` : ''}
      </div>
    </div>`;
}

function renderList(items) {
  return [...items]
    .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))
    .map(renderCard)
    .join('');
}

async function init() {
  const listEl = document.getElementById('michelin-list');
  const countEl = document.getElementById('michelin-count');
  const starTabs = document.getElementById('star-tabs');
  if (!listEl) return;

  let all;
  try {
    all = await loadMichelin();
  } catch (err) {
    listEl.innerHTML = '<p class="trending-desc">The restaurant list is temporarily unavailable. Please try again shortly.</p>';
    console.error(err);
    return;
  }

  const topTier = all.filter((m) => m.stars === 2 || m.stars === 3);
  let selectedStars = 'all';

  function applyFilter() {
    const filtered = selectedStars === 'all' ? topTier : topTier.filter((m) => m.stars === selectedStars);
    listEl.innerHTML = renderList(filtered);
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${topTier.length}`;
    if (window.goatcounter && window.goatcounter.bind_events) {
      window.goatcounter.bind_events();
    }
  }

  if (starTabs) {
    starTabs.addEventListener('click', (event) => {
      const btn = event.target.closest('.tab-btn');
      if (!btn) return;
      selectedStars = btn.dataset.stars === 'all' ? 'all' : Number(btn.dataset.stars);
      starTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      applyFilter();
    });
  }

  applyFilter();
}

init();
