// English interactive map. Ports the Japanese site's js/map.js (same
// Leaflet + OpenStreetMap approach, same pin/legend/locate UI) with English
// strings and English-only data sources.
//
// Categories whose data files might not exist yet (built by a separate
// pass) are loaded with fetchJsonOrEmpty() instead of a hard Promise.all,
// so this page degrades gracefully — it works today with whatever's
// present and picks up the rest automatically once those files land,
// with no code change needed here.

import { arrondissementLabel } from './arrondissement-labels.js';
import { geocodeAddress } from '../../js/geocode.js';

const CATEGORIES = {
  contest: { label: 'Bakery competition winners', color: '#c9972c' },
  michelin: { label: 'Michelin-starred', color: '#7f1d1d' },
  hotel: { label: 'Hotels', color: '#2980b9' },
  restaurant: { label: 'Restaurants', color: '#e74c3c' },
  cafe: { label: 'Cafés', color: '#8d6e63' },
  chocolatier: { label: 'Chocolatiers', color: '#6b3e26' },
  patisserie: { label: 'Pâtisseries', color: '#c88ea7' },
  bakery: { label: 'Favorite bakeries', color: '#e67e22' },
  souvenir: { label: 'Souvenirs', color: '#e84393' },
  toilet: { label: 'Public toilets', color: '#7f8c8d', defaultVisible: false }
};

// data/toilets.json's `type` field is French; translated for the popup.
const TOILET_TYPE_LABELS = {
  Sanisette: 'Self-cleaning cabin',
  WC: 'Standard toilet',
  Urinoir: 'Urinal',
  'Urinoir femme': "Women's urinal",
  Lavatory: 'Lavatory'
};

function formatToiletHours(hours) {
  if (!hours) return '';
  if (hours === '24/24h') return '24 hours';
  if (hours === 'Horaires du parc') return "Same hours as the park it's in";
  return hours.replace(/(\d{1,2})h(\d{2})/g, '$1:$2');
}

const ARRONDISSEMENT_ORDER = [
  '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
  '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// Same-origin data files that may not have been built yet — resolves to
// an empty array instead of throwing, so a missing file just means that
// category has no pins yet rather than breaking the whole map.
async function fetchJsonOrEmpty(path) {
  try {
    return await fetchJson(path);
  } catch {
    return [];
  }
}

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

function youAreHereIcon() {
  return L.divIcon({
    className: 'map-you-marker',
    html: '<div class="map-you-pulse"></div><div class="map-you-dot"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function popupHtml({ name, meta, description, mapUrl, sourceUrl, categoryLabel }) {
  return `
    <div class="map-popup">
      <p class="map-popup-category">${escapeHtml(categoryLabel)}</p>
      <p class="map-popup-name">${escapeHtml(name)}</p>
      ${meta ? `<p class="map-popup-meta">${escapeHtml(meta)}</p>` : ''}
      ${description ? `<p class="map-popup-desc">${escapeHtml(description)}</p>` : ''}
      <div class="map-popup-links">
        ${mapUrl ? `<a class="btn btn-outline shop-map-link" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}
        ${sourceUrl ? `<a class="ranking-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Source &#8599;</a>` : ''}
      </div>
    </div>`;
}

function buildPoints({ shops, results, michelin, hotels, restaurantsCafes, chocolatiersPatisseries, bakeries, souvenirs, toilets }) {
  const points = [];

  // Bakery competition winners: latest year per contest only, same as the
  // Japanese site's map (a full multi-year history would clutter the map).
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
        description: null,
        mapUrl: shop.google_maps_url,
        sourceUrl: result.source_url
      });
    }
  }

  for (const m of michelin) {
    if (m.lat === null) continue;
    const metaParts = [arrondissementLabel(m.arrondissement)];
    if (m.address) metaParts.push(m.address + (m.hotel ? ` (${m.hotel})` : ''));
    points.push({
      category: 'michelin',
      arrondissement: m.arrondissement,
      lat: m.lat,
      lng: m.lng,
      name: `${m.name} ${'★'.repeat(m.stars)}`,
      meta: metaParts.join(' &middot; '),
      description: null,
      mapUrl: m.google_maps_url,
      sourceUrl: m.source_url
    });
  }

  for (const h of hotels) {
    if (h.lat == null) continue;
    points.push({
      category: 'hotel',
      arrondissement: h.arrondissement,
      lat: h.lat,
      lng: h.lng,
      name: h.name,
      meta: `${arrondissementLabel(h.arrondissement)} &middot; ${h.address}`,
      description: h.whyThisLocation,
      mapUrl: h.googleMapsUrl,
      sourceUrl: null
    });
  }

  for (const item of restaurantsCafes) {
    if (item.lat == null) continue;
    points.push({
      category: item.category === 'cafe' ? 'cafe' : 'restaurant',
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      meta: `${arrondissementLabel(item.arrondissement)} &middot; ${item.address}`,
      description: item.description || null,
      mapUrl: item.googleMapsUrl,
      sourceUrl: null
    });
  }

  for (const item of chocolatiersPatisseries) {
    if (item.lat == null) continue;
    points.push({
      category: item.category === 'patisserie' ? 'patisserie' : 'chocolatier',
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      meta: `${arrondissementLabel(item.arrondissement)} &middot; ${item.address}`,
      description: item.description || null,
      mapUrl: item.googleMapsUrl,
      sourceUrl: null
    });
  }

  for (const item of bakeries) {
    if (item.lat == null) continue;
    points.push({
      category: 'bakery',
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      meta: `${arrondissementLabel(item.arrondissement)} &middot; ${item.address}`,
      description: item.description || null,
      mapUrl: item.googleMapsUrl,
      sourceUrl: null
    });
  }

  for (const item of souvenirs) {
    if (item.lat == null) continue;
    points.push({
      category: 'souvenir',
      arrondissement: item.arrondissement,
      lat: item.lat,
      lng: item.lng,
      name: item.name,
      meta: `${arrondissementLabel(item.arrondissement)} &middot; ${item.address}`,
      description: item.description || null,
      mapUrl: item.googleMapsUrl,
      sourceUrl: null
    });
  }

  for (const t of toilets) {
    const typeLabel = TOILET_TYPE_LABELS[t.type] || t.type || 'Public toilet';
    const notes = [typeLabel];
    if (t.pmr_accessible) notes.push('wheelchair accessible');
    if (t.baby_changing) notes.push('baby changing table');
    points.push({
      category: 'toilet',
      arrondissement: t.arrondissement,
      lat: t.lat,
      lng: t.lng,
      name: 'Public toilet',
      meta: `${arrondissementLabel(t.arrondissement)} &middot; ${formatToiletHours(t.hours)}`,
      description: notes.join(' &middot; '),
      mapUrl: t.google_maps_url,
      sourceUrl: null
    });
  }

  return points;
}

async function init() {
  const [shops, results, michelin, hotels, restaurantsCafes, chocolatiersPatisseries, bakeries, souvenirs, toilets] = await Promise.all([
    fetchJson('../data/shops.json'),
    fetchJson('../data/results.json'),
    fetchJson('../data/michelin.json'),
    fetchJson('data/hotels-en.json'),
    fetchJsonOrEmpty('data/restaurants-cafes-en.json'),
    fetchJsonOrEmpty('data/chocolatiers-patisseries-en.json'),
    fetchJsonOrEmpty('data/bakeries-en.json'),
    fetchJsonOrEmpty('data/souvenirs-en.json'),
    fetchJson('../data/toilets.json')
  ]);

  const points = buildPoints({ shops, results, michelin, hotels, restaurantsCafes, chocolatiersPatisseries, bakeries, souvenirs, toilets });

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

  const selectedCategories = new Set(
    Object.entries(CATEGORIES)
      .filter(([, config]) => config.defaultVisible !== false)
      .map(([key]) => key)
  );
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

  applyFilters();

  const legendEl = document.getElementById('map-legend');
  const presentArrondissements = ARRONDISSEMENT_ORDER.filter((a) => entries.some((e) => e.arrondissement === a));
  const arrondissementOptions = presentArrondissements
    .map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(arrondissementLabel(a))}</option>`)
    .join('');

  legendEl.innerHTML = `
    <div class="map-legend-header">
      <span class="map-legend-title">Filter</span>
      <button id="map-legend-toggle" class="map-legend-toggle" type="button" aria-controls="map-legend-body">&#9662;</button>
    </div>
    <div id="map-legend-body" class="map-legend-body">
      <div class="map-search-box">
        <input id="map-address-input" class="map-search-input" type="text" placeholder="Search address or hotel name">
        <button id="map-address-btn" class="map-search-btn" type="button">Search</button>
      </div>
      <p id="map-search-status" class="map-search-status"></p>
      <div class="map-legend-filter">
        <label for="map-arrondissement-select">Filter by area</label>
        <select id="map-arrondissement-select">
          <option value="all">All areas</option>
          ${arrondissementOptions}
        </select>
      </div>
    </div>`;

  const categoryLegendEl = document.getElementById('map-category-legend');
  categoryLegendEl.innerHTML = `
    <p class="map-category-legend-title">Show categories</p>
    <div class="map-legend-categories">
      ${Object.entries(CATEGORIES)
        .map(
          ([key, config]) => `
          <label class="map-legend-item">
            <input type="checkbox" data-category="${key}" ${config.defaultVisible === false ? '' : 'checked'}>
            <span class="map-legend-dot" style="background:${config.color}"></span>
            ${escapeHtml(config.label)}
          </label>`
        )
        .join('')}
    </div>`;

  const legendToggle = document.getElementById('map-legend-toggle');
  const legendBody = document.getElementById('map-legend-body');

  function setLegendExpanded(expanded) {
    legendBody.hidden = !expanded;
    legendToggle.setAttribute('aria-expanded', String(expanded));
    legendToggle.innerHTML = expanded ? '&#9652;' : '&#9662;';
  }

  setLegendExpanded(!window.matchMedia('(max-width: 479px)').matches);
  legendToggle.addEventListener('click', () => {
    setLegendExpanded(legendToggle.getAttribute('aria-expanded') !== 'true');
  });

  let searchMarker = null;
  let locateMarker = null;
  const searchStatusEl = document.getElementById('map-search-status');

  function setSearchMarker(lat, lng, label) {
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lng], { icon: pinIcon('#1a1a2e'), zIndexOffset: 1000 }).addTo(map);
    if (label) searchMarker.bindPopup(`<div class="map-popup"><p class="map-popup-name">${escapeHtml(label)}</p></div>`).openPopup();
    map.setView([lat, lng], 15);
  }

  const addressInput = document.getElementById('map-address-input');
  const addressBtn = document.getElementById('map-address-btn');

  async function runAddressSearch() {
    const query = addressInput.value.trim();
    if (!query) return;
    searchStatusEl.textContent = 'Searching…';
    try {
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        searchStatusEl.textContent = "Couldn't find that address — try writing it a different way.";
        return;
      }
      setSearchMarker(matches[0].lat, matches[0].lng, matches[0].label);
      searchStatusEl.textContent = '';
    } catch (err) {
      searchStatusEl.textContent = 'Something went wrong while searching — please try again shortly.';
    }
  }

  addressBtn.addEventListener('click', runAddressSearch);
  addressInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runAddressSearch();
  });

  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const container = L.DomUtil.create('div', 'leaflet-bar map-locate-control');
      const button = L.DomUtil.create('a', 'map-locate-btn', container);
      button.href = '#';
      button.title = 'Show my location';
      button.setAttribute('role', 'button');
      button.setAttribute('aria-label', 'Show my location');
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        locateMe();
      });
      return container;
    }
  });
  map.addControl(new LocateControl());

  function locateMe() {
    if (!navigator.geolocation) {
      searchStatusEl.textContent = "This device doesn't support location lookup — try the address search instead.";
      return;
    }
    searchStatusEl.textContent = 'Getting your location…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (locateMarker) map.removeLayer(locateMarker);
        locateMarker = L.marker([latitude, longitude], { icon: youAreHereIcon(), zIndexOffset: 2000 }).addTo(map);
        map.setView([latitude, longitude], 15);
        searchStatusEl.textContent = '';
      },
      () => {
        searchStatusEl.textContent = "Couldn't get your location — try the address search instead.";
      }
    );
  }

  categoryLegendEl.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-category]');
    if (!checkbox) return;
    if (checkbox.checked) {
      selectedCategories.add(checkbox.dataset.category);
    } else {
      selectedCategories.delete(checkbox.dataset.category);
    }
    applyFilters();
  });

  legendEl.addEventListener('change', (event) => {
    const select = event.target.closest('#map-arrondissement-select');
    if (select) {
      selectedArrondissement = select.value;
      applyFilters();
    }
  });
}

init();
