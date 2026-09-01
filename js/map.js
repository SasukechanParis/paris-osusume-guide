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

  const layers = {};
  for (const key of Object.keys(CATEGORIES)) {
    layers[key] = L.layerGroup();
  }

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
    layers[point.category].addLayer(marker);
  }

  for (const key of Object.keys(CATEGORIES)) {
    layers[key].addTo(map);
  }

  const legendEl = document.getElementById('map-legend');
  legendEl.innerHTML = Object.entries(CATEGORIES)
    .map(
      ([key, config]) => `
      <label class="map-legend-item">
        <input type="checkbox" data-category="${key}" checked>
        <span class="map-legend-dot" style="background:${config.color}"></span>
        ${config.label}
      </label>`
    )
    .join('');

  legendEl.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-category]');
    if (!checkbox) return;
    const key = checkbox.dataset.category;
    if (checkbox.checked) {
      layers[key].addTo(map);
    } else {
      map.removeLayer(layers[key]);
    }
  });
}

init();
