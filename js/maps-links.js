// Googleマップへのリンク組み立て(APIキー不要のURL形式)。
// 「お店を見る」(検索)と「経路」(dir)は別のボタンとして使う。

const SEARCH_BASE = 'https://www.google.com/maps/search/?api=1&query=';
const DIR_BASE = 'https://www.google.com/maps/dir/?api=1&destination=';

function destinationText(place) {
  const text = [place.name, place.address].filter(Boolean).join(' ').trim();
  if (text) return text;
  if (typeof place.lat === 'number' && typeof place.lng === 'number') return `${place.lat},${place.lng}`;
  return null;
}

function coord(n) {
  return Number(n.toFixed(6)).toString();
}

export function buildPlaceSearchUrl(place) {
  const text = destinationText(place);
  return text ? `${SEARCH_BASE}${encodeURIComponent(text)}` : null;
}

// origin: 利用者が自分で選んだ出発地点だけを渡す。
//   { lat, lng }              → 主要地点・ホテル住所など(originに入れる)
//   { lat, lng, kind: 'gps' } → 現在地。位置情報をURLに残さないため origin は付けない
export function buildDirectionsUrl(place, origin = null) {
  const text = destinationText(place);
  if (!text) return null;
  let url = `${DIR_BASE}${encodeURIComponent(text)}`;
  if (origin && origin.kind !== 'gps' && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
    url += `&origin=${encodeURIComponent(`${coord(origin.lat)},${coord(origin.lng)}`)}`;
  }
  return url;
}
