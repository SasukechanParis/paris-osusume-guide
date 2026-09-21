const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT_PARAM = 'paris-bread-contest-guide (personal, non-commercial lookup)';

export function parseNominatimResults(raw) {
  return raw.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name
  }));
}

// 英語版(en/js)も import している。オプションなしの呼び出しは従来どおり limit=1・全世界検索。
//   limit: 候補数, countrycodes: 例 'fr'(検索範囲を国で限定), viewbox: 優先する範囲, signal: 中断用
export function buildGeocodeUrl(query, { limit = 1, countrycodes = null, viewbox = null } = {}) {
  const country = countrycodes ? `&countrycodes=${encodeURIComponent(countrycodes)}` : '';
  // viewbox(左,上,右,下)は「この範囲を優先」する指定。範囲外の結果も除外はしない(bounded=0)
  const box = viewbox ? `&viewbox=${encodeURIComponent(viewbox)}&bounded=0` : '';
  return `${NOMINATIM_ENDPOINT}?format=json&limit=${limit}${country}${box}&q=${encodeURIComponent(query)}&email=${encodeURIComponent(USER_AGENT_PARAM)}`;
}

export async function geocodeAddress(query, options = {}) {
  const res = await fetch(buildGeocodeUrl(query, options), {
    headers: { Accept: 'application/json' },
    signal: options.signal
  });
  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status}`);
  }
  const json = await res.json();
  return parseNominatimResults(json);
}
