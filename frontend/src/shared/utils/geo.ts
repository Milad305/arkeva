/**
 * هندسهٔ مختصات برای نمایش موقعیت گزارش. محاسبهٔ کسب‌وکاری نیست (D07): فاصله و جهت را در
 * واقعیت سرور می‌دهد (`02-domain-model.md` ۶: «distanceFromSiteM در سرور محاسبه
 * می‌شود») و اینجا فقط همان سرور شبیه‌سازی می‌شود.
 */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

/** نقطه‌ای به فاصله و جهت مشخص از یک نقطه (فرمول haversine وارون). */
export function destinationPoint(origin: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const angular = distanceM / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: round6(toDeg(lat2)), lng: round6(toDeg(lng2)) };
}

/** فاصلهٔ دو نقطه به متر (haversine) — همان عددی که سرور `distanceFromSiteM` می‌فرستد. */
export function distanceBetween(from: LatLng, to: LatLng): number {
  const deltaLat = toRad(to.lat - from.lat);
  const deltaLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** جهت نقطهٔ دوم نسبت به نقطهٔ اول، از شمال و ساعتگرد (۰ تا ۳۶۰). */
export function bearingBetween(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const deltaLng = toRad(to.lng - from.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** شش رقم اعشار ≈ ۱۱ سانتی‌متر؛ بیشتر از دقت GPS گوشی است. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * پیوند نمایش یک نقطه روی نشان (تصمیم کاربر 1405/08/23). پیوند ساده است و کلید
 * سرویس نمی‌خواهد؛ باز کردنش با کلیک خود کاربر است.
 */
export const neshanPointUrl = (point: LatLng, zoom = 17) =>
  `https://neshan.org/maps/@${point.lat},${point.lng},${zoom}z`;

/** «۳۵٫۷۲۱۹۰۰، ۵۱٫۳۳۴۷۰۰» — نمایش لاتین با شش رقم، برای کپی و پیوند. */
export const formatLatLng = (point: LatLng) => `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;

/** جهت تقریبی به فارسی برای خواندن کنار طرح شعاع. */
export function compassLabel(bearingDeg: number): string {
  const names = ['شمال', 'شمال‌شرقی', 'شرق', 'جنوب‌شرقی', 'جنوب', 'جنوب‌غربی', 'غرب', 'شمال‌غربی'];
  const normalized = ((bearingDeg % 360) + 360) % 360;
  return names[Math.round(normalized / 45) % 8]!;
}
