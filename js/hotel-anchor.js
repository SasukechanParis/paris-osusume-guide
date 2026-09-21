// 「このホテル周辺を保存」: 利用者が保存を押したときだけ、宿泊先の名前と座標を端末内に保存する。
// アクセス解析にも共有URLにも含めない(このファイルの外へ出さない)。

const KEY = 'hotel';

function isValid(hotel) {
  return (
    hotel &&
    typeof hotel.name === 'string' &&
    hotel.name.length > 0 &&
    Number.isFinite(hotel.lat) &&
    Number.isFinite(hotel.lng) &&
    hotel.lat >= -90 &&
    hotel.lat <= 90 &&
    hotel.lng >= -180 &&
    hotel.lng <= 180 &&
    typeof hotel.savedAt === 'string'
  );
}

export function loadHotel(store) {
  const hotel = store.get(KEY);
  return isValid(hotel) ? hotel : null;
}

// name は利用者が入力した宿泊先名。now は保存日(YYYY-MM-DD)の注入用
export function saveHotel(store, { name, lat, lng }, now = new Date()) {
  const hotel = { name: String(name).trim().slice(0, 80), lat, lng, savedAt: now.toISOString().slice(0, 10) };
  if (!isValid(hotel)) return { ok: false, reason: 'invalid' };
  return store.set(KEY, hotel);
}

export function clearHotel(store) {
  store.remove(KEY);
}
