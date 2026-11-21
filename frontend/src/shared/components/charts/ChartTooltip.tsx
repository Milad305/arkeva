import type { ReactNode } from 'react';

export interface ChartTooltipRow {
  key: string;
  label: string;
  color: string;
  value: ReactNode;
  dashed?: boolean;
}

export interface ChartTooltipProps {
  /** مختصات نقطه در دستگاه `viewBox`. */
  x: number;
  y: number;
  viewW: number;
  viewH: number;
  title: ReactNode;
  rows: ChartTooltipRow[];
  note?: ReactNode;
}

/**
 * کارت راهنمای نمودار — یک ظاهر برای همهٔ نمودارها (منحنی S، سری زمانی، گانت،
 * heatmap، treemap). HTML است نه SVG، تا فارسی، راست‌به‌چپ و ارقام فارسی درست
 * بنشیند و با `<title>` بومی مرورگر که تأخیر دارد و لاتین است فرق کند.
 *
 * جایش با درصد داده می‌شود تا با هر اندازهٔ ظرف درست بماند؛ نزدیک لبه به سمت
 * دیگر نقطه می‌پرد.
 */
export function ChartTooltip({ x, y, viewW, viewH, title, rows, note }: ChartTooltipProps) {
  const left = (x / viewW) * 100;
  const top = (y / viewH) * 100;
  // نزدیک لبهٔ راست، کارت سمت چپ نقطه می‌نشیند
  const flip = left > 62;

  return (
    <div
      role="tooltip"
      className="chart-tip"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${flip ? '-100%' : '0'}, -50%) translateX(${flip ? -12 : 12}px)`,
      }}
    >
      <span className="chart-tip-title">{title}</span>
      {rows.map((row) => (
        <span key={row.key} className="chart-tip-row">
          <span
            className="chart-tip-swatch"
            style={
              row.dashed
                ? { borderTop: `2px dashed ${row.color}` }
                : { background: row.color }
            }
          />
          <span className="chart-tip-label">{row.label}</span>
          <span className="chart-tip-value">{row.value}</span>
        </span>
      ))}
      {note && <span className="chart-tip-note">{note}</span>}
    </div>
  );
}

/**
 * جدول دادهٔ نمودار برای صفحه‌خوان. نمودار SVG با یک `aria-label` فقط یک جملهٔ
 * خلاصه می‌دهد؛ این جدول عددهای واقعی را می‌دهد بی‌آنکه دیده شود.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  return (
    <table className="chart-sr-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            {row.cells.map((cell, position) => (
              <td key={columns[position] ?? position}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** یک سطر راهنما با نمونهٔ رنگ — برای راهنمای شناور گانت، heatmap و treemap. */
export function HoverTipRow({ color, label, value }: { color?: string; label: string; value?: ReactNode }) {
  return (
    <span className="chart-tip-row">
      {color && <span className="chart-tip-swatch" style={{ background: color }} />}
      <span className="chart-tip-label">{label}</span>
      {value !== undefined && <span className="chart-tip-value">{value}</span>}
    </span>
  );
}
