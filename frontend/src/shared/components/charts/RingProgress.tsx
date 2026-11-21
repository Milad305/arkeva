import { clampPercent, formatPercent } from '@/shared/utils/num';

export interface RingProgressProps {
  /** درصد ۰ تا ۱۰۰ — مقدار از سرور، فقط رسم می‌شود. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** متن مرکز؛ پیش‌فرض خود درصد. */
  label?: string;
}

/**
 * حلقهٔ پیشرفت — کارت «پیشرفت فیزیکی» W10.
 * پرشدن ساعت‌گرد از بالا، مثل آرت‌بورد (`rotate(-90)` + آینه برای RTL).
 */
export function RingProgress({
  value,
  size = 52,
  stroke = 5,
  color = 'var(--primary-700)',
  label,
}: RingProgressProps) {
  const pct = clampPercent(value);
  const radius = (size - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const text = label ?? formatPercent(pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={text}>
      <circle cx={center} cy={center} r={radius} stroke="#E4E4E7" strokeWidth={stroke} fill="none" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center}) translate(${size} 0) scale(-1 1)`}
      />
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="#18181B"
        fontFamily="Vazirmatn"
      >
        {text}
      </text>
    </svg>
  );
}
