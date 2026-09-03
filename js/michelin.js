import { renderMichelinList, arrondissementLabel } from './render.js';
import { setupNearbySearch } from './nearby-search.js';

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e'
];

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const michelin = await loadJson('data/michelin.json');

  const listEl = document.getElementById('michelin-list');
  const countEl = document.getElementById('michelin-count');
  const starTabs = document.getElementById('star-tabs');
  const arrSelect = document.getElementById('michelin-arr-select');
  const genreSelect = document.getElementById('michelin-genre-select');

  const presentArrondissements = ARRONDISSEMENT_ORDER.filter((a) => michelin.some((m) => m.arrondissement === a));
  arrSelect.innerHTML =
    '<option value="all">すべてのエリア</option>' +
    presentArrondissements.map((a) => `<option value="${a}">${arrondissementLabel(a)}</option>`).join('');

  const genres = [...new Set(michelin.map((m) => m.genre).filter(Boolean))].sort(
    (a, b) => michelin.filter((m) => m.genre === b).length - michelin.filter((m) => m.genre === a).length
  );
  genreSelect.innerHTML =
    '<option value="all">すべてのジャンル</option>' + genres.map((g) => `<option value="${g}">${g}</option>`).join('');

  let selectedStars = 'all';
  let selectedArr = 'all';
  let selectedGenre = 'all';

  function applyFilters() {
    const filtered = michelin.filter(
      (m) =>
        (selectedStars === 'all' || m.stars === selectedStars) &&
        (selectedArr === 'all' || m.arrondissement === selectedArr) &&
        (selectedGenre === 'all' || m.genre === selectedGenre)
    );
    listEl.innerHTML = renderMichelinList(filtered);
    countEl.textContent = `${filtered.length}件表示中(全${michelin.length}件)`;
  }

  starTabs.addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    selectedStars = btn.dataset.stars === 'all' ? 'all' : Number(btn.dataset.stars);
    starTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    applyFilters();
  });

  arrSelect.addEventListener('change', () => {
    selectedArr = arrSelect.value;
    applyFilters();
  });

  genreSelect.addEventListener('change', () => {
    selectedGenre = genreSelect.value;
    applyFilters();
  });

  applyFilters();
  setupNearbySearch(michelin);
}

init();
