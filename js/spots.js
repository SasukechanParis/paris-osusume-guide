// 位置情報なしで検索の起点にできる主要地点。
// 座標は OpenStreetMap(Nominatim)で2026-09-21に各ランドマークを検索して確認し、
// 小数4桁(約10m)に丸めた値。店舗の座標と同様、実際の位置と数十mずれる場合がある。

export const MAIN_SPOTS = [
  { id: 'opera', label: 'オペラ座', fr: 'Palais Garnier', lat: 48.8721, lng: 2.3323 },
  { id: 'louvre', label: 'ルーヴル美術館', fr: 'Musée du Louvre', lat: 48.8611, lng: 2.338 },
  { id: 'trocadero', label: 'トロカデロ広場', fr: 'Place du Trocadéro', lat: 48.8621, lng: 2.2885 },
  { id: 'eiffel', label: 'エッフェル塔', fr: 'Tour Eiffel', lat: 48.8583, lng: 2.2945 },
  { id: 'arc-de-triomphe', label: '凱旋門', fr: 'Arc de Triomphe', lat: 48.8738, lng: 2.295 },
  { id: 'vendome', label: 'ヴァンドーム広場', fr: 'Place Vendôme', lat: 48.8675, lng: 2.3294 },
  { id: 'pont-alexandre-iii', label: 'アレクサンドル3世橋', fr: 'Pont Alexandre III', lat: 48.8635, lng: 2.3135 },
  { id: 'tuileries', label: 'チュイルリー公園', fr: 'Jardin des Tuileries', lat: 48.8636, lng: 2.327 },
  { id: 'palais-royal', label: 'パレ・ロワイヤル', fr: 'Palais Royal', lat: 48.8636, lng: 2.3362 },
  { id: 'orsay', label: 'オルセー美術館', fr: "Musée d'Orsay", lat: 48.8599, lng: 2.3266 },
  { id: 'notre-dame', label: 'ノートルダム大聖堂', fr: 'Cathédrale Notre-Dame', lat: 48.8529, lng: 2.3501 },
  { id: 'sacre-coeur', label: 'サクレ・クール寺院', fr: 'Basilique du Sacré-Cœur', lat: 48.8868, lng: 2.343 }
];

export function findSpot(id) {
  return MAIN_SPOTS.find((spot) => spot.id === id) ?? null;
}
