import { RISK_LEVEL } from '@/config/constants';
import { Legend } from '@/shared/components/ui/Legend';
import { toFaDigits } from '@/shared/utils/num';
import { cellLevel, LEVEL_ZONE } from '../services/riskView';

export interface RiskMatrixProps {
  /** شمار ریسک‌های باز ارزیابی‌شده در هر خانه — کلید `${احتمال}-${اثر}` (سرور). */
  counts?: Record<string, number>;
  /** خانهٔ انتخاب‌شده برای فیلتر فهرست (W18) یا امتیاز فرم (W44). */
  selected?: { probability: number; impact: number } | null;
  onSelect?: (cell: { probability: number; impact: number } | null) => void;
  /** کوچک — کنار فرم W44. */
  compact?: boolean;
}

/**
 * ماتریس ۵×۵ احتمال × اثر (risk.md ۶): رنگ خانه از امتیاز آن خانه، عدد = شمار ریسک‌های باز
 * ارزیابی‌شده. کلیک روی خانه فهرست را فیلتر می‌کند؛ کلیک دوباره فیلتر را برمی‌دارد.
 */
export function RiskMatrix({ counts, selected, onSelect, compact }: RiskMatrixProps) {
  const size = compact ? 24 : 46;
  return (
    <div className="col g6" style={{ alignItems: compact ? 'center' : 'stretch' }}>
      <div className="row g8 ai-st">
        {!compact && (
          <span className="t-xs tx5 fw6" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', alignSelf: 'center' }}>
            احتمال ←
          </span>
        )}
        <div className="col grow" style={{ gap: compact ? 3 : 6 }} role="grid" aria-label="ماتریس احتمال × اثر">
          {[5, 4, 3, 2, 1].map((probability) => (
            <div key={probability} role="row" style={{ display: 'grid', gridTemplateColumns: compact ? `repeat(5, ${size}px)` : `26px repeat(5, minmax(0, 1fr))`, gap: compact ? 3 : 6 }}>
              {!compact && <span className="t-sm tx6 fw6 row" style={{ justifyContent: 'center' }}>{toFaDigits(probability)}</span>}
              {[1, 2, 3, 4, 5].map((impact) => {
                const zone = LEVEL_ZONE[cellLevel(probability, impact)];
                const count = counts?.[`${probability}-${impact}`] ?? 0;
                const isSelected = selected?.probability === probability && selected?.impact === impact;
                const label = `احتمال ${toFaDigits(probability)} × اثر ${toFaDigits(impact)} = ${toFaDigits(probability * impact)}${counts ? ` · ${toFaDigits(count)} ریسک` : ''}`;
                const style = {
                  height: size,
                  minWidth: compact ? size : undefined,
                  borderRadius: compact ? 5 : 8,
                  background: compact && isSelected ? '#DC2626' : zone.bg,
                  color: compact && isSelected ? '#FFFFFF' : zone.fg,
                  fontWeight: 700,
                  fontSize: compact ? 10 : 15,
                  border: !compact && (count > 0 || isSelected) ? `2px solid ${zone.fg}` : '1px solid rgba(24,24,27,0.04)',
                  boxShadow: isSelected ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${compact ? '#DC2626' : zone.fg}` : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                } as const;
                const text = compact ? (isSelected ? toFaDigits(probability * impact) : '') : count > 0 ? toFaDigits(count) : '';
                return onSelect && !compact ? (
                  <button key={impact} type="button" role="gridcell" aria-label={label} aria-selected={isSelected} title={label} style={style} onClick={() => onSelect(isSelected ? null : { probability, impact })}>
                    {text}
                  </button>
                ) : (
                  <span key={impact} role="gridcell" aria-label={label} title={label} style={style}>
                    {text}
                  </span>
                );
              })}
            </div>
          ))}
          {!compact && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '26px repeat(5, minmax(0, 1fr))', gap: 6 }}>
                <span />
                {[1, 2, 3, 4, 5].map((impact) => (
                  <span key={impact} className="t-sm tx6 fw6 row" style={{ justifyContent: 'center' }}>
                    {toFaDigits(impact)}
                  </span>
                ))}
              </div>
              <span className="t-xs tx5 fw6 row" style={{ justifyContent: 'center' }}>
                اثر ←
              </span>
            </>
          )}
        </div>
      </div>
      {compact && <span className="t-xs tx5">احتمال × اثر</span>}
    </div>
  );
}

export const RISK_LEGEND = (['low', 'medium', 'high', 'critical'] as const).map((level) => ({
  label: `${RISK_LEVEL[level]} (${level === 'low' ? '۱–۸' : level === 'medium' ? '۹–۱۴' : level === 'high' ? '۱۵–۱۹' : '۲۰–۲۵'})`,
  color: LEVEL_ZONE[level].bg,
  shape: 'square' as const,
}));

export function RiskLegend() {
  return <Legend entries={RISK_LEGEND} style={{ gap: 12 }} />;
}
