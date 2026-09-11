// Wires the "find nearest" widget on michelin-star-restaurants-paris.html
// into the shared en/js/nearby-search-en.js module. Kept separate from
// michelin-en.js (which owns the filterable full-list view) so each file
// has one job.

import { arrondissementLabel } from './arrondissement-labels.js';
import { setupNearbySearchEn } from './nearby-search-en.js';

async function init() {
  const res = await fetch('../data/michelin.json');
  if (!res.ok) return;
  const all = await res.json();

  const items = all
    .filter((m) => m.lat !== null && m.lng !== null)
    .map((m) => ({
      name: `${m.name} ${'★'.repeat(m.stars)}`,
      arrondissement: arrondissementLabel(m.arrondissement),
      address: m.hotel ? `${m.address} (${m.hotel})` : m.address,
      googleMapsUrl: m.google_maps_url,
      lat: m.lat,
      lng: m.lng
    }));

  setupNearbySearchEn(items);
}

init();
