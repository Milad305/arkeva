// فاصله و جهت مهر مکان از مرکز کارگاه (approval-workflow.md ۳.۲، ۵.۲؛ D07: در سرور حساب می‌شوند). تابع خالص.

const EARTH_RADIUS_M = 6_371_000;
const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** فاصلهٔ دایرهٔ بزرگ (haversine) به متر، گرد به نزدیک‌ترین متر. */
export function distanceM(from: { readonly lat: number; readonly lng: number }, to: { readonly lat: number; readonly lng: number }): number {
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a))));
}

/** جهت اولیه از `from` به `to`، از شمال و ساعتگرد، ۰ تا ۳۶۰ درجه (یک رقم اعشار). */
export function bearingDeg(from: { readonly lat: number; readonly lng: number }, to: { readonly lat: number; readonly lng: number }): number {
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round(((degrees + 360) % 360) * 10) / 10;
}
