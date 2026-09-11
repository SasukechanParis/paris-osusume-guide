// Renders /en/michelin-star-restaurants-paris.html from the repo-root
// /data/michelin.json (fetched via a relative ../data/ path).
//
// Self-contained: no dependency on the Japanese site's js/data.js or
// js/render.js (same convention as en/js/hotels-en.js). Covers all 127
// entries (1/2/3 star), filterable by star, arrondissement, and cuisine.
// The JSON's Japanese-language `description` field is never displayed here;
// `genre` is translated via GENRE_LABELS below.

import { arrondissementLabel } from './arrondissement-labels.js';

const ARR_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

// French-to-English cuisine genre labels, translated from michelin.json's
// Japanese `genre` field (itself already translated from French on the
// Japanese site). Kept here rather than in the data file since it's
// presentation, not fact.
const GENRE_LABELS = {
  'フレンチ': 'French',
  '日本料理': 'Japanese',
  'モダン料理': 'Modern',
  'フレンチ・日本料理': 'French-Japanese',
  'イタリアン': 'Italian',
  '地中海料理': 'Mediterranean',
  '創作料理': 'Creative',
  'アジアンフュージョン・フレンチ': 'Asian Fusion-French',
  'レバノン料理': 'Lebanese',
  'チュニジア料理': 'Tunisian',
  'カナダ料理・フレンチ': 'Canadian-French',
  'シーフード': 'Seafood',
  'アフリカ料理・フレンチ': 'African-French',
  '中華': 'Chinese',
  'レユニオン料理': 'Réunionese',
  'ギリシャ料理': 'Greek',
  '西アフリカ料理・日本料理': 'West African-Japanese',
  '北欧料理': 'Nordic',
  'エジプト料理・フレンチ': 'Egyptian-French',
  'メキシコ料理': 'Mexican',
  'フレンチ・北欧料理': 'French-Nordic',
  'イスラエル料理': 'Israeli',
  'アジアンフュージョン': 'Asian Fusion'
};

function genreLabel(genre) {
  return GENRE_LABELS[genre] ?? genre ?? '';
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
  const genreBadge = item.genre
    ? `<span class="status-badge status-badge-genre">${escapeHtml(genreLabel(item.genre))}</span>`
    : '';
  return `
    <div class="trending-card">
      <div class="trending-name-row">
        <p class="trending-name">${escapeHtml(item.name)}</p>
        <span class="status-badge status-badge-michelin">${'&#9733;'.repeat(item.stars)}</span>
        ${genreBadge}
      </div>
      <p class="trending-meta">${metaParts.map(escapeHtml).join(' &middot; ')}</p>
      <div class="ranking-links">
        ${item.google_maps_url ? `<a class="btn btn-outline shop-map-link" href="${escapeHtml(item.google_maps_url)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}
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

function populateSelect(selectEl, values, labelFor) {
  const sorted = [...values].sort((a, b) => labelFor(a).localeCompare(labelFor(b)));
  for (const value of sorted) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = labelFor(value);
    selectEl.appendChild(opt);
  }
}

async function init() {
  const listEl = document.getElementById('michelin-list');
  const countEl = document.getElementById('michelin-count');
  const starTabs = document.getElementById('star-tabs');
  const arrSelect = document.getElementById('michelin-arr-filter');
  const genreSelect = document.getElementById('michelin-genre-filter');
  if (!listEl) return;

  let all;
  try {
    all = await loadMichelin();
  } catch (err) {
    listEl.innerHTML = '<p class="trending-desc">The restaurant list is temporarily unavailable. Please try again shortly.</p>';
    console.error(err);
    return;
  }

  let selectedStars = 'all';
  let selectedArr = 'all';
  let selectedGenre = 'all';

  if (arrSelect) {
    const arrPresent = [...new Set(all.map((m) => m.arrondissement))];
    const ordered = ARR_ORDER.filter((a) => arrPresent.includes(a));
    for (const arr of ordered) {
      const opt = document.createElement('option');
      opt.value = arr;
      opt.textContent = arrondissementLabel(arr);
      arrSelect.appendChild(opt);
    }
  }
  if (genreSelect) {
    const genresPresent = [...new Set(all.map((m) => m.genre).filter(Boolean))];
    populateSelect(genreSelect, genresPresent, genreLabel);
  }

  function applyFilter() {
    const filtered = all.filter((m) => {
      if (selectedStars !== 'all' && m.stars !== selectedStars) return false;
      if (selectedArr !== 'all' && m.arrondissement !== selectedArr) return false;
      if (selectedGenre !== 'all' && m.genre !== selectedGenre) return false;
      return true;
    });
    listEl.innerHTML = renderList(filtered);
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${all.length}`;
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
  if (arrSelect) {
    arrSelect.addEventListener('change', () => {
      selectedArr = arrSelect.value;
      applyFilter();
    });
  }
  if (genreSelect) {
    genreSelect.addEventListener('change', () => {
      selectedGenre = genreSelect.value;
      applyFilter();
    });
  }

  applyFilter();
}

init();
