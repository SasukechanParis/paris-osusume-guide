import { haversineDistanceKm } from './distance.js';

export function sortShopsByDistance(shops, originLat, originLng) {
  return shops
    .map((shop) => ({
      shop,
      distanceKm: haversineDistanceKm(originLat, originLng, shop.lat, shop.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
