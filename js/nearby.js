import { haversineDistanceKm } from './distance.js';

export function sortShopsByDistance(shops, originLat, originLng) {
  return shops
    .filter((shop) => shop.lat !== null && shop.lng !== null)
    .map((shop) => ({
      shop,
      distanceKm: haversineDistanceKm(originLat, originLng, shop.lat, shop.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
