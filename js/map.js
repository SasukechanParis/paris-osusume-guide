import { arrondissementLabel } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

const CATEGORIES = {
  contest: { label: 'パンコンクール受賞店', color: '#c9972c' },
  trending: { label: '今話題のこと', color: '#9b59b6' },
  restaurant: { label: 'レストラン', color: '#e74c3c' },
  chocolatier: { label: 'ショコラティエ', color: '#6b3e26' },
  bakery: { label: 'パン屋さん', color: '#e67e22' },
  souvenir: { label: 'お土産', color: '#e84393' },
  supermarket: { label: 'スーパーで買えるおすすめ', color: '#27ae60' },
  hotel: { label: 'ホテル', color: '#2980b9' },
  michelin: { label: 'ミシュラン星付き', color: '#7f1d1d' }
};

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

function pinIcon(color) {
  const svg = `
    <svg width="27" height="38" viewBox="0 0 27 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 0C6.04 0 0 6.04 0 13.5 0 23.63 13.5 38 13.5 38S27 23.63 27 13.5C27 6.04 20.96 0 13.5 0z"
            fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>
      <circle cx="13.5" cy="13.5" r="5.5" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    className: 'map-pin',
    html: svg,
    iconSize: [27, 38],
    iconAnchor: [13.5, 38],
    popupAnchor: [0, -34]
  });
}

function popupHtml({ name, meta, description, mapUrl, sourceUrl, categoryLabel }) {
  return `
    <div class="map-popup">
      <p class="map-popup-category">${categoryLabel}</p>
      <p class="map-popup-name">${name}</p>
      ${meta ? `<p class="map-popup-meta">${meta}</p>` : ''}
      ${description ? `<p class="map-popup-desc">${description}</p>` : ''}
      <div class="map-popup-links">
        ${mapUrl ? `<a class="btn btn-outline shop-map-link" href="${mapUrl}" target="_blank" rel="noopener">Googleマップで開く</a>` : ''}
        ${sourceUrl ? `<a class="ranking-source" href="${sourceUrl}">出典 ↗</a>` : ''}
      </div>
    </div>`;
}

function buildPoints(shops, results, recommendations, guestRecommendations, trending, michelin) {
  const points = [];

  const shopById = new Map(shops.map((s) => [s.id, s]));
  const latestByContest = new Map();
  for (const r of results) {
    const current = latestByContest.get(r.contest_id);
    if (!current || r.year > current.year) latestByContest.set(r.contest_id, r);
  }
  const seenShopIds = new Set();
  for (const result of latestByContest.values()) {
    for (const ranking of result.rankings) {
      if (!ranking.shop_id || seenShopIds.has(ranking.shop_id)) continue;
      const shop = shopById.get(ranking.shop_id);
      if (!shop || shop.lat === null) continue;
      seenShopIds.add(ranking.shop_id);
      points.push({
        category: 'contest',
        arrondissement: shop.arrondissement,
        lat: shop.lat,
        lng: shop.lng,
        name: shop.name,
        meta: arrondissementLabel(shop.arrondissement),
        description: shop.description,
        mapUrl: shop.google_maps_url,
        sourceUrl: result.source_url
      });
    }
  }

  for (const item of [...recommendations, ...guestRecommendations]) {
    if (item.lat === null) continue;
    points.push({
      category: item.category,
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      meta: `${arrondissementLabel(item.arrondissement)} ・ ${item.address}`,
      description: item.description,
      mapUrl: item.google_maps_url,
      sourceUrl: null
    });
  }

  for (const t of trending) {
    points.push({
      category: 'trending',
      arrondissement: t.arrondissement,
      lat: t.lat,
      lng: t.lng,
      name: t.name,
      meta: arrondissementLabel(t.arrondissement),
      description: t.description,
      mapUrl: t.google_maps_url,
      sourceUrl: t.source_url
    });
  }

  for (const m of michelin) {
    points.push({
      category: 'michelin',
      arrondissement: m.arrondissement,
      lat: m.lat,
      lng: m.lng,
      name: `${m.name} ${'★'.repeat(m.stars)}`,
      meta: `${arrondissementLabel(m.arrondissement)} ・ ${m.address}${m.hotel ? ` (${m.hotel})` : ''}`,
      description: m.description,
      mapUrl: m.google_maps_url,
      sourceUrl: m.source_url
    });
  }

  return points;
}

async function init() {
  const [shops, results, recommendations, guestRecommendations, trending, michelin] = await Promise.all([
    loadJson('data/shops.json'),
    loadJson('data/results.json'),
    loadJson('data/recommendations.json'),
    loadJson('data/guest-recommendations.json'),
    loadJson('data/trending.json'),
    loadJson('data/michelin.json')
  ]);

  const points = buildPoints(shops, results, recommendations, guestRecommendations, trending, michelin);

  const map = L.map('map-canvas', { zoomControl: false }).setView([48.8613, 2.3324], 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const entries = [];
  for (const point of points) {
    const config = CATEGORIES[point.category];
    if (!config) continue;
    const marker = L.marker([point.lat, point.lng], { icon: pinIcon(config.color) });
    marker.bindPopup(
      popupHtml({
        name: point.name,
        meta: point.meta,
        description: point.description,
        mapUrl: point.mapUrl,
        sourceUrl: point.sourceUrl,
        categoryLabel: config.label
      })
    );
    entries.push({ marker, category: point.category, arrondissement: point.arrondissement });
    marker.addTo(map);
  }

  const selectedCategories = new Set(Object.keys(CATEGORIES));
  let selectedArrondissement = 'all';

  function applyFilters() {
    for (const entry of entries) {
      const matches =
        selectedCategories.has(entry.category) &&
        (selectedArrondissement === 'all' || entry.arrondissement === selectedArrondissement);
      const onMap = map.hasLayer(entry.marker);
      if (matches && !onMap) entry.marker.addTo(map);
      if (!matches && onMap) map.removeLayer(entry.marker);
    }
  }

  const legendEl = document.getElementById('map-legend');
  const presentArrondissements = ARRONDISSEMENT_ORDER.filter((a) => entries.some((e) => e.arrondissement === a));
  const arrondissementOptions = presentArrondissements
    .map((a) => `<option value="${a}">${arrondissementLabel(a)}</option>`)
    .join('');

  legendEl.innerHTML = `
    <div class="map-legend-filter">
      <label for="map-arrondissement-select">エリアで絞り込み</label>
      <select id="map-arrondissement-select">
        <option value="all">すべてのエリア</option>
        ${arrondissementOptions}
      </select>
    </div>
    <div class="map-legend-categories">
      ${Object.entries(CATEGORIES)
        .map(
          ([key, config]) => `
          <label class="map-legend-item">
            <input type="checkbox" data-category="${key}" checked>
            <span class="map-legend-dot" style="background:${config.color}"></span>
            ${config.label}
          </label>`
        )
        .join('')}
    </div>`;

  legendEl.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-category]');
    if (checkbox) {
      if (checkbox.checked) {
        selectedCategories.add(checkbox.dataset.category);
      } else {
        selectedCategories.delete(checkbox.dataset.category);
      }
      applyFilters();
      return;
    }
    const select = event.target.closest('#map-arrondissement-select');
    if (select) {
      selectedArrondissement = select.value;
      applyFilters();
    }
  });
}

init();
