import { toFaDigits } from '@/shared/utils/num';

function angleOf(seed: string): number {
  let h = 0;
  for (let index = 0; index < seed.length; index += 1) h = (h * 31 + seed.charCodeAt(index)) | 0;
  return (Math.abs(h) % 360);
}

/**
 * طرح ساده‌ی موقعیت (W40 «نقشهٔ GPS با دایرهٔ شعاع کارگاه»): دایرهٔ شعاع مجاز و نقطهٔ گزارش
 * به فاصله و جهت واقعی. شمال بالاست، مثل هر نقشه، نه راست‌به‌چپ.
 *
 * نقشهٔ واقعی با کاشی نقشه پس از انتخاب سرویس نقشه می‌آید (`project-setup.md` ۱۴ مرحلهٔ ۷)؛
 * تا آن وقت «مشاهده روی نقشه» همین طرح به‌علاوهٔ مختصات و پیوند نشان است.
 */
export function GpsSketch({
  distanceM,
  radiusM,
  seed,
  bearingDeg,
  size = 112,
  showNorth,
}: {
  distanceM: number | null;
  radiusM: number;
  seed: string;
  /** جهت واقعی از سرور؛ اگر نیاید جهت نمایشی از `seed` ساخته می‌شود. */
  bearingDeg?: number | null;
  size?: number;
  showNorth?: boolean;
}) {
  const center = size / 2;
  const scale = (size / 2 - 10) / Math.max(radiusM * 1.6, (distanceM ?? 0) * 1.1);
  const r = radiusM * scale;
  // شمال بالا، ساعتگرد: ۰ درجه رو به بالا
  const bearing = ((bearingDeg ?? angleOf(seed)) * Math.PI) / 180;
  const outside = distanceM != null && distanceM > radiusM;
  const x = center + Math.sin(bearing) * (distanceM ?? 0) * scale;
  const y = center - Math.cos(bearing) * (distanceM ?? 0) * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={distanceM == null ? 'بدون موقعیت GPS' : `موقعیت گزارش ${toFaDigits(distanceM)} متر از مرکز کارگاه؛ شعاع مجاز ${toFaDigits(radiusM)} متر`}
      style={{ flex: '0 0 auto', borderRadius: 10, background: '#F4F6F9', border: '1px solid #E4E4E7' }}
    >
      <circle cx={center} cy={center} r={r} fill="#E5EBF3" stroke="#8AA2C2" strokeDasharray="4 3" />
      <circle cx={center} cy={center} r={3} fill="#1A3354" />
      {showNorth && (
        <text x={center} y={13} textAnchor="middle" fontSize={9} fill="#71717A">
          شمال
        </text>
      )}
      {distanceM != null && (
        <>
          <line x1={center} y1={center} x2={x} y2={y} stroke={outside ? '#DC2626' : '#2C4A73'} strokeWidth={1} strokeDasharray="2 2" />
          <circle cx={x} cy={y} r={5.5} fill={outside ? '#DC2626' : '#16A34A'} stroke="#FFFFFF" strokeWidth={2} />
        </>
      )}
    </svg>
  );
}
