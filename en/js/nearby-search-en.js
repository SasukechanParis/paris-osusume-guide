// Shared "find the nearest one to you" widget for English pages.
//
// The distance math (Haversine) is reused directly from the Japanese site's
// js/nearby.js and js/geocode.js — pure logic, no UI text, safe to import
// as-is. Only this file's own strings are English.
//
// Callers pass a flat array of items already shaped as:
//   { name, arrondissement, address, googleMapsUrl, lat, lng, note }
// (lat/lng may be null; those items are simply excluded from results.)
// See en/js/hotels-en.js or en/js/bakery-awards.js for how a page's own
// data gets mapped into this shape before calling setupNearbySearchEn.
//
// Expects this markup (ids optionally suffixed) somewhere on the page,
// normally just before the closing </footer>:
//
// <div class="nearby-form">
//   <button id="gps-btn" class="btn gps-btn" type="button">Use my location</button>
//   <div class="nearby-divider">or search by address / hotel name</div>
//   <div class="nearby-row">
//     <input id="address-input" class="nearby-input" type="text" placeholder="e.g. Hôtel de la Paix, 9th arrondissement">
//     <button id="address-search-btn" class="btn btn-outline" type="button">Search</button>
//   </div>
//   <p id="nearby-status" class="section-note" style="margin:0;"></p>
// </div>
// <div id="nearby-results" class="nearby-results"></div>

import { sortShopsByDistance } from '../../js/nearby.js';
import { geocodeAddress } from '../../js/geocode.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDistance(distanceKm) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function renderResults(sorted) {
  if (!sorted.length) {
    return '<p class="trending-desc">Nothing on this list has a mapped location yet.</p>';
  }
  return sorted
    .map(
      ({ shop, distanceKm }) => `
    <div class="nearby-card">
      <div>
        <p class="nearby-card-name">${escapeHtml(shop.name)}</p>
        <p class="nearby-card-meta">${[shop.arrondissement, shop.address].filter(Boolean).map(escapeHtml).join(' &middot; ')}</p>
        ${shop.note ? `<p class="shop-note">${escapeHtml(shop.note)}</p>` : ''}
      </div>
      <div class="nearby-distance">${formatDistance(distanceKm)}</div>
      <a class="btn btn-outline shop-map-link" href="${escapeHtml(shop.googleMapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>
    </div>`
    )
    .join('');
}

export function setupNearbySearchEn(items, { idSuffix = '' } = {}) {
  const statusEl = document.getElementById(`nearby-status${idSuffix}`);
  const resultsEl = document.getElementById(`nearby-results${idSuffix}`);
  const gpsBtn = document.getElementById(`gps-btn${idSuffix}`);
  const addressInput = document.getElementById(`address-input${idSuffix}`);
  const addressBtn = document.getElementById(`address-search-btn${idSuffix}`);
  if (!statusEl || !resultsEl || !gpsBtn || !addressInput || !addressBtn) return;

  function showResults(lat, lng) {
    const sorted = sortShopsByDistance(items, lat, lng);
    resultsEl.innerHTML = renderResults(sorted);
    statusEl.textContent = '';
    if (window.goatcounter && window.goatcounter.bind_events) window.goatcounter.bind_events();
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusEl.textContent = "This device doesn't support location lookup — try the address search instead.";
      return;
    }
    statusEl.textContent = 'Getting your location…';
    navigator.geolocation.getCurrentPosition(
      (pos) => showResults(pos.coords.latitude, pos.coords.longitude),
      () => {
        statusEl.textContent = "Couldn't get your location — try the address search instead.";
      }
    );
  });

  addressBtn.addEventListener('click', async () => {
    const query = addressInput.value.trim();
    if (!query) return;
    statusEl.textContent = 'Searching…';
    try {
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        statusEl.textContent = "Couldn't find that address — try writing it a different way.";
        return;
      }
      showResults(matches[0].lat, matches[0].lng);
    } catch (err) {
      statusEl.textContent = 'Something went wrong while searching — please try again shortly.';
    }
  });

  addressInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addressBtn.click();
  });
}
