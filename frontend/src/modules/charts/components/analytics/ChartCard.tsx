import { useRef, type ReactNode } from 'react';

import { toast } from '@/shared/components/feedback/toastStore';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import type { IconName } from '@/shared/components/ui/Icon';
import { downloadCsv, toCsv, type CsvColumn } from '@/shared/utils/csv';
import { downloadChartPng, downloadChartSvg, toggleFullscreen } from '@/shared/utils/svgExport';

export interface ChartCsv<T> {
  fileName: string;
  rows: readonly T[];
  columns: Array<CsvColumn<T>>;
}

/**
 * قاب هر نمودار F17: عنوان، زیرعنوان، راهنما و منوی نمودار (بوم W45): دانلود PNG و SVG
 * از همان نمودار، دانلود دادهٔ همان سری (charts.md ۷؛ بدون مبلغ وقتی مجوز نیست — سرور
 * مبلغ را تهی می‌فرستد) و نمای تمام‌صفحه.
 */
export function ChartCard<T>({
  icon,
  iconClassName = 'tx-pri',
  title,
  subtitle,
  legend,
  csv,
  action,
  footer,
  children,
  className,
  exportName,
}: {
  icon: IconName;
  iconClassName?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  csv?: ChartCsv<T>;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** نام فایل خروجی تصویری؛ اگر نیاید از نام فایل CSV ساخته می‌شود. */
  exportName?: string;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const fileName = exportName ?? csv?.fileName ?? 'chart';

  /**
   * بزرگ‌ترین SVG کارت همان نمودار است؛ آیکون عنوان و آیکون‌های دکمه‌ها هم SVG‌اند،
   * پس اولین گره به درد نمی‌خورد. زیر ۴۰×۴۰ پیکسل نمودار نیست.
   */
  const svgOf = (): SVGSVGElement | null => {
    let best: SVGSVGElement | null = null;
    let bestArea = 1600;
    for (const svg of cardRef.current?.querySelectorAll('svg') ?? []) {
      const box = svg.getBoundingClientRect();
      const area = box.width * box.height;
      if (area > bestArea) {
        bestArea = area;
        best = svg;
      }
    }
    return best;
  };

  const menu: MenuEntry[] = [
    {
      key: 'png',
      label: 'دانلود PNG',
      icon: 'image-plus',
      onSelect: () => {
        const svg = svgOf();
        if (!svg) {
          toast.error('این کارت نمودار برداری ندارد؛ از «دانلود داده‌ها» استفاده کنید.');
          return;
        }
        void downloadChartPng(svg, fileName).catch(() => toast.error('تصویر ساخته نشد؛ «دانلود SVG» را امتحان کنید.'));
      },
    },
    {
      key: 'svg',
      label: 'دانلود SVG',
      icon: 'file-code',
      onSelect: () => {
        const svg = svgOf();
        if (!svg) {
          toast.error('این کارت نمودار برداری ندارد؛ از «دانلود داده‌ها» استفاده کنید.');
          return;
        }
        downloadChartSvg(svg, fileName);
      },
    },
    ...(csv
      ? [
          {
            key: 'csv',
            label: 'دانلود داده‌ها (CSV)',
            icon: 'file-spreadsheet' as const,
            onSelect: () => downloadCsv(csv.fileName, toCsv(csv.rows, csv.columns)),
          },
        ]
      : []),
    { key: 'sep', separator: true },
    {
      key: 'fullscreen',
      label: 'نمای تمام‌صفحه',
      icon: 'maximize-2',
      trailing: 'F',
      onSelect: () => {
        if (cardRef.current) void toggleFullscreen(cardRef.current).catch(() => toast.error('مرورگر نمای تمام‌صفحه را اجازه نداد.'));
      },
    },
    {
      key: 'settings',
      label: 'تنظیمات نمودار',
      icon: 'settings',
      disabled: true,
      disabledReason: 'تنظیمات هر نمودار هنوز در سند تعریف نشده است.',
    },
  ];

  return (
    <Card className={className} ref={cardRef}>
      <CardHeader
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        subtitle={subtitle}
        action={
          <span className="row wrap g8 no-print">
            {legend}
            {action}
            {csv && (
              <IconButton icon="file-spreadsheet" label="دانلود CSV" size="sm" onClick={() => downloadCsv(csv.fileName, toCsv(csv.rows, csv.columns))} />
            )}
            <Menu
              align="start"
              entries={menu}
              trigger={(props) => <IconButton {...props} icon="more-vertical" label="گزینه‌های نمودار" size="sm" />}
            />
          </span>
        }
      />
      {children}
      {footer && (
        <div className="row wrap g20" style={{ padding: '10px 18px', background: '#FAFAFA', borderTop: '1px solid #F4F4F5' }}>
          {footer}
        </div>
      )}
    </Card>
  );
}

/** عدد زیر نمودار: «CPI ۰٫۹۷». */
export function ChartStat({ label, value, className, explain }: { label: ReactNode; value: ReactNode; className?: string; explain?: ReactNode }) {
  return (
    <span className="col">
      <span className="t-xs tx5 row g4">
        {label}
        {explain}
      </span>
      <span className={`num-i ${className ?? ''}`}>{value}</span>
    </span>
  );
}

/**
 * راهنمای رنگ کنار عنوان. با `onToggle` دکمه می‌شود و سری را خاموش و روشن می‌کند
 * (همان رفتار چیپ‌های منحنی S)؛ بدون آن فقط برچسب رنگ است.
 */
export function LegendItem({
  color,
  label,
  dashed,
  onToggle,
  off,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  onToggle?: () => void;
  /** سری خاموش است — رنگ کم‌رنگ و خط روی برچسب. */
  off?: boolean;
}) {
  const swatch = (
    <span style={{ width: 14, flex: '0 0 auto', ...(dashed ? { borderTop: `2px dashed ${color}` } : { height: 3, borderRadius: 2, background: color }) }} />
  );

  if (!onToggle) {
    return (
      <span className="row g4 t-12 tx6">
        {swatch}
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="row g4 t-12 tx6"
      onClick={onToggle}
      aria-pressed={!off}
      title={off ? `نمایش ${label}` : `پنهان کردن ${label}`}
      style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', opacity: off ? 0.45 : 1, textDecoration: off ? 'line-through' : undefined }}
    >
      {swatch}
      {label}
    </button>
  );
}
