/** Pure Qibla geometry — the Kaaba, great-circle distance and bearing. */

/** The Kaaba, al-Masjid al-Ḥarām. */
export const KAABA = { lat: 21.4225, lng: 39.8262 };

/** Great-circle distance (km) between two coordinates. */
export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number } = KAABA,
): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial great-circle bearing from `from` to the Kaaba, degrees clockwise from true north [0, 360). */
export function qiblaBearing(from: { lat: number; lng: number }): number {
  const phi1 = (from.lat * Math.PI) / 180;
  const phi2 = (KAABA.lat * Math.PI) / 180;
  const dLambda = ((KAABA.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/** Smallest signed angle (degrees) from `from` to `to`, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
