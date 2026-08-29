const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT_PARAM = 'paris-bread-contest-guide (personal, non-commercial lookup)';

export function parseNominatimResults(raw) {
  return raw.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name
  }));
}

export async function geocodeAddress(query) {
  const url = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(query)}&email=${encodeURIComponent(USER_AGENT_PARAM)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status}`);
  }
  const json = await res.json();
  return parseNominatimResults(json);
}
