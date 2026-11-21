import { cn } from '@/shared/utils/cn';

export type LegendShape = 'bar' | 'dash' | 'square';

export interface LegendEntry {
  label: string;
  color: string;
  shape?: LegendShape;
  /** ضخامت خط — بوم برای سری «واقعی» ۴px می‌دهد. */
  thickness?: number;
}

export interface LegendProps {
  entries: LegendEntry[];
  className?: string;
  style?: React.CSSProperties;
}

/** راهنمای نمودار — `.lg` در kit.css با سه شکل نشانه. */
export function Legend({ entries, className, style }: LegendProps) {
  return (
    <div className={cn('row g16 wrap', className)} style={style}>
      {entries.map((entry) => (
        <span key={entry.label} className="lg" style={{ color: entry.color }}>
          <i
            className={cn(entry.shape === 'dash' && 'dash', entry.shape === 'square' && 'sq')}
            style={
              entry.shape === 'dash'
                ? undefined
                : { background: entry.color, height: entry.thickness }
            }
          />
          <span className="tx6">{entry.label}</span>
        </span>
      ))}
    </div>
  );
}
