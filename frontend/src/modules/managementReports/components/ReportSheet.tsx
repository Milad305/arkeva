import { WBS_PROGRESS_STATUS } from '@/config/constants';
import { BrandMark } from '@/shared/components/layout/BrandMark';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, formatRatio, formatRial, toFaDigits } from '@/shared/utils/num';
import type { Tone } from '@/shared/types/tone';
import type { ReportPreviewDto, ReportPreviewSectionDto } from '../types';

const TONE_COLOR: Record<Tone, string> = {
  ok: '#15803D',
  inf: '#1D4ED8',
  wrn: '#B45309',
  err: '#B91C1C',
  neu: '#52525B',
  pri: '#1A3354',
  acc: '#B45309',
  vio: '#6D28D9',
  cya: '#0E7490',
};

/** منحنی فشردهٔ صفحهٔ گزارش — نسخهٔ کوچک منحنی S، بدون محور و برچسب. */
function MiniCurve({ planned, actual, todayIndex }: { planned: Array<number | null>; actual: Array<number | null>; todayIndex: number }) {
  const count = Math.max(planned.length, actual.length, 2);
  const x = (index: number) => 4 + (index * 352) / (count - 1);
  const y = (value: number) => 88 - value * 0.8;
  const path = (values: Array<number | null>) => {
    const points = values
      .map((value, index) => (value === null ? null : ([x(index), y(value)] as [number, number])))
      .filter((point): point is [number, number] => point !== null);
    if (points.length === 0) return '';
    let d = `M${points[0]![0]},${points[0]![1]}`;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const point = points[index]!;
      const cx = (previous[0] + point[0]) / 2;
      d += ` C${cx},${previous[1]} ${cx},${point[1]} ${point[0]},${point[1]}`;
    }
    return d;
  };

  return (
    <svg viewBox="0 0 360 92" width="100%" role="img" aria-label="منحنی پیشرفت برنامه‌ای و واقعی" style={{ display: 'block' }}>
      <path d="M0 8H360M0 50H360M0 88H360" stroke="#F4F4F5" />
      <path d={path(planned)} stroke="#8AA2C2" strokeWidth={1.6} fill="none" strokeDasharray="4 3" />
      <path d={path(actual)} stroke="#1A3354" strokeWidth={2.2} fill="none" />
      <path d={`M${x(todayIndex)} 4V88`} stroke="#DC2626" strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  );
}

function SheetTitle({ children }: { children: React.ReactNode }) {
  return <span className="rpt-h3">{children}</span>;
}

function PairRow({ right, left, color }: { right: React.ReactNode; left: React.ReactNode; color?: string }) {
  return (
    <div className="rpt-pair">
      <span className="trunc">{right}</span>
      <span style={{ fontWeight: 700, color }}>{left}</span>
    </div>
  );
}

function Section({ section }: { section: ReportPreviewSectionDto }) {
  if (section.empty) {
    return (
      <div className="rpt-block">
        <SheetTitle>{section.title}</SheetTitle>
        <span className="rpt-muted">{section.empty}</span>
      </div>
    );
  }

  switch (section.key) {
    case 'summary':
      return (
        <div className="rpt-block">
          <div className="rpt-kpis">
            {section.kpis.map((kpi) => (
              <div key={kpi.label} className="rpt-kpi">
                <span className="rpt-muted">{kpi.label}</span>
                <span className="rpt-kpi-v" style={{ color: TONE_COLOR[kpi.tone] }}>
                  {kpi.value}
                </span>
                {kpi.sub && <span className="rpt-muted">{kpi.sub}</span>}
              </div>
            ))}
          </div>
          <p className="rpt-note">{section.text}</p>
        </div>
      );

    case 'progress':
      return (
        <div className="rpt-block">
          <div className="row between">
            <SheetTitle>{section.title}</SheetTitle>
            <span className="row g8 rpt-muted">
              <span className="row" style={{ gap: 3 }}>
                <i style={{ width: 10, borderTop: '1.5px dashed #8AA2C2' }} />
                برنامه {formatPercentAuto(section.plannedPercent)}
              </span>
              <span className="row" style={{ gap: 3 }}>
                <i style={{ width: 10, height: 2, background: '#1A3354' }} />
                واقعی {formatPercentAuto(section.actualPercent)}
              </span>
            </span>
          </div>
          <MiniCurve
            planned={section.curve.map((point) => point.planned)}
            actual={section.curve.map((point) => point.actual)}
            todayIndex={section.todayIndex}
          />
          {section.deviations.length > 0 && (
            <div className="rpt-block" style={{ gap: 2 }}>
              <SheetTitle>مهم‌ترین انحراف‌ها</SheetTitle>
              {section.deviations.slice(0, 5).map((item) => (
                <PairRow
                  key={item.code}
                  right={
                    <>
                      <span className="mono rpt-muted">{item.code}</span> {item.title}
                    </>
                  }
                  left={formatPercentAuto(item.deviation)}
                  color={item.deviation <= -15 ? TONE_COLOR.err : TONE_COLOR.wrn}
                />
              ))}
            </div>
          )}
        </div>
      );

    case 'cost':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <div className="rpt-kpis">
            <div className="rpt-kpi">
              <span className="rpt-muted">بودجه (BAC)</span>
              <span className="rpt-kpi-v">{formatRial(section.bac)}</span>
            </div>
            <div className="rpt-kpi">
              <span className="rpt-muted">هزینهٔ واقعی (AC)</span>
              <span className="rpt-kpi-v">{formatRial(section.ac)}</span>
            </div>
            <div className="rpt-kpi">
              <span className="rpt-muted">ارزش کسب‌شده (EV)</span>
              <span className="rpt-kpi-v">{formatRial(section.ev)}</span>
            </div>
            <div className="rpt-kpi">
              <span className="rpt-muted">پیش‌بینی (EAC)</span>
              <span className="rpt-kpi-v">{formatRial(section.eac)}</span>
            </div>
          </div>
          <div className="row g12 wrap">
            <span>
              CPI <strong>{section.cpi === null ? '—' : formatRatio(section.cpi)}</strong>
            </span>
            <span>
              TCPI <strong>{section.tcpi === null ? '—' : formatRatio(section.tcpi)}</strong>
            </span>
          </div>
          <div className="rpt-block" style={{ gap: 3 }}>
            {section.byType.slice(0, 5).map((entry) => (
              <div key={entry.type} className="row g6">
                <CostTypeTag type={entry.type} />
                <span className="pbar thin" style={{ flex: 1 }}>
                  <i style={{ width: `${entry.percent}%`, background: '#8AA2C2' }} />
                </span>
                <span style={{ width: 34, textAlign: 'end' }}>{formatPercentAuto(entry.percent)}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'cost_ledger':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>قلم CBS</th>
                <th>بودجه</th>
                <th>هزینهٔ واقعی</th>
                <th>مصرف</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.slice(0, 8).map((row) => (
                <tr key={row.code}>
                  <td>
                    <span className="mono rpt-muted">{row.code}</span> {row.title}
                  </td>
                  <td>{formatRial(row.budget)}</td>
                  <td>{formatRial(row.ac)}</td>
                  <td>{formatPercentAuto(row.consumedPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PairRow right="جمع هزینهٔ واقعی" left={formatRial(section.total)} />
        </div>
      );

    case 'risks':
      return (
        <div className="rpt-block">
          <div className="row between">
            <SheetTitle>{section.title}</SheetTitle>
            <span className="rpt-muted">
              {toFaDigits(section.openCount)} ریسک باز · {toFaDigits(section.criticalCount)} بحرانی
            </span>
          </div>
          {section.items.slice(0, 5).map((risk) => (
            <PairRow
              key={risk.code}
              right={
                <>
                  <span className="mono rpt-muted">{risk.code}</span> {risk.title}
                </>
              }
              left={risk.score === null ? '—' : toFaDigits(risk.score)}
              color={TONE_COLOR[risk.tone]}
            />
          ))}
        </div>
      );

    case 'resources':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <div className="rpt-kpis">
            <div className="rpt-kpi">
              <span className="rpt-muted">گزارش‌های بازه</span>
              <span className="rpt-kpi-v">{toFaDigits(section.reportCount)}</span>
            </div>
            <div className="rpt-kpi">
              <span className="rpt-muted">پوشش گزارش روزانه</span>
              <span className="rpt-kpi-v">{formatPercentAuto(section.coveragePercent)}</span>
            </div>
            <div className="rpt-kpi">
              <span className="rpt-muted">میانگین زمان تأیید</span>
              <span className="rpt-kpi-v">{toFaDigits(Math.round(section.avgApprovalHours))} ساعت</span>
            </div>
          </div>
          {section.supervisors.map((person) => (
            <PairRow
              key={person.name}
              right={person.name}
              left={`${toFaDigits(person.reports)} گزارش${person.coveragePercent === null ? '' : ` · ${formatPercentAuto(person.coveragePercent)}`}`}
            />
          ))}
        </div>
      );

    case 'field':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <p className="rpt-note">
            <strong>گزارش‌های کارگاه:</strong> {section.text}
          </p>
        </div>
      );

    case 'photos':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <div className="rpt-photos">
            {section.items.slice(0, 12).map((photo, index) => (
              <figure key={`${photo.code}-${index}`} className="rpt-photo">
                <span className="rpt-photo-box" aria-hidden="true" />
                <figcaption className="rpt-muted trunc">
                  <span className="mono">{photo.code}</span> {photo.title} · {formatJalaliDate(photo.takenAt)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      );

    case 'milestones':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          {section.items.map((milestone) => (
            <PairRow
              key={milestone.title}
              right={milestone.title}
              left={`${formatJalaliDate(milestone.plannedDate)}${
                milestone.delayWorkingDays && milestone.delayWorkingDays > 0 ? ` · ${toFaDigits(milestone.delayWorkingDays)} روز تأخیر` : ''
              }`}
              color={milestone.delayWorkingDays && milestone.delayWorkingDays > 0 ? TONE_COLOR.err : undefined}
            />
          ))}
          <span className="rpt-muted">
            وضعیت‌ها: {section.items.map((milestone) => WBS_PROGRESS_STATUS[milestone.status]).slice(0, 3).join('، ')}
          </span>
        </div>
      );

    case 'integration':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          {section.rows.map((row) => (
            <PairRow key={row.label} right={row.label} left={row.value} color={TONE_COLOR[row.tone]} />
          ))}
        </div>
      );

    case 'portfolio':
      return (
        <div className="rpt-block">
          <SheetTitle>{section.title}</SheetTitle>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>پروژه</th>
                <th>برنامه‌ای</th>
                <th>واقعی</th>
                <th>انحراف</th>
                <th>CPI</th>
                <th>SPI</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="mono rpt-muted">{row.code}</span> {row.name}
                  </td>
                  <td>{formatPercentAuto(row.plannedPercent)}</td>
                  <td>{formatPercentAuto(row.actualPercent)}</td>
                  <td style={{ color: row.deviation <= -15 ? TONE_COLOR.err : row.deviation < 0 ? TONE_COLOR.wrn : TONE_COLOR.ok }}>
                    {formatPercentAuto(row.deviation)}
                  </td>
                  <td>{row.cpi === null ? '—' : formatRatio(row.cpi)}</td>
                  <td>{row.spi === null ? '—' : formatRatio(row.spi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

export interface ReportSheetProps {
  preview: ReportPreviewDto;
  /** در پیش‌نمایش کوچک نسبت A4 نگه داشته می‌شود؛ در چاپ آزاد است. */
  compact?: boolean;
}

/**
 * صفحهٔ گزارش — همان چیزی که سرور به PDF تبدیل می‌کند (۷.۲): راست‌به‌چپ، ارقام
 * فارسی، تاریخ شمسی، سرصفحهٔ سازمان و پروژه و بازه، پاصفحهٔ «تولید خودکار».
 */
export function ReportSheet({ preview, compact = true }: ReportSheetProps) {
  return (
    <article className={compact ? 'rpt-sheet compact' : 'rpt-sheet'} dir="rtl" lang="fa">
      {preview.watermark === 'open_period' && (
        <div className="rpt-wm" aria-hidden="true">
          <span>پیش‌نویس</span>
        </div>
      )}

      <header className="row between rpt-sheet-head">
        <span className="row g6">
          <BrandMark size="sm" />
          <span className="col">
            <span style={{ fontWeight: 700 }}>پروژه‌یار</span>
            <span className="rpt-muted">{preview.header.orgName}</span>
          </span>
        </span>
        <span className="col" style={{ alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 700 }}>{preview.templateName}</span>
          <span className="rpt-muted">{preview.header.rangeLabel}</span>
        </span>
      </header>

      <div className="col" style={{ gap: 1 }}>
        <span className="rpt-h1">{preview.header.projectName}</span>
        <span className="rpt-muted">
          <span className="mono">{preview.header.projectCode}</span> · کارفرما: {preview.header.clientName} · مدیر پروژه:{' '}
          {preview.header.managerName}
        </span>
      </div>

      {preview.sections.map((section) => (
        <Section key={section.key} section={section} />
      ))}

      <footer className="row between rpt-sheet-foot">
        <span>
          {preview.openPeriodNote ?? `دورهٔ بسته · ${preview.sourceKind === 'period_snapshot' ? 'اعداد ثابت‌اند' : ''}`}
        </span>
        <span>تولید خودکار در پروژه‌یار · {preview.header.generatedAtLabel}</span>
      </footer>
    </article>
  );
}
