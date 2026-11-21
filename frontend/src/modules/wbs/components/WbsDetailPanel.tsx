import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES, WBS_DEEP_LINKS } from '@/config/routes';
import {
  FIELD_REPORT_ITEM_STATUS,
  FIELD_REPORT_ITEM_STATUS_TONES,
  LEAF_MEASUREMENT_METHODS,
  WBS_PROGRESS_STATUS,
  WBS_PROGRESS_STATUS_TONES,
} from '@/config/constants';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Skeleton, SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { KeyValue, KeyValueGrid } from '@/shared/components/ui/KeyValue';
import { Menu } from '@/shared/components/ui/Menu';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { TextArea } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, formatJalaliDateTime, todayIso } from '@/shared/utils/date';
import { formatPercentAuto, formatQuantity, formatRialParts, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useGetWbsItemQuery, useUpdateWbsStatusNoteMutation } from '../api/wbsApi';
import type { WbsPermissions } from '../hooks/useWbsPermissions';
import { formatDeviation, STATUS_COLOR } from '../services/progressView';
import { buildWbsItemMenu, copyItemLink, isReportable } from '../services/wbsActions';
import type { WbsItemDetailDto, WbsItemDto, WbsLinkedCbsDto, WbsReportItemSummaryDto } from '../types';
import { QuickApproveDialog } from '@/modules/reports/components/QuickApproveDialog';

export interface WbsDetailPanelProps {
  projectId: EntityId;
  itemId: EntityId | null;
  can: WbsPermissions;
  onSelect: (itemId: EntityId) => void;
  descendantCount: (itemId: EntityId) => number;
}

/**
 * پنل جزئیات W11 — منبع هر جزء در `features/wbs.md` ۸:
 * پیشرفت از `WbsItemProgress`، اقلام CBS از F05/F10، گزارش‌ها از `FieldReportItem`.
 * عنوان و فیلدهای برنامه اینجا ویرایش نمی‌شوند (نسخهٔ کاری، W12)؛ فقط یادداشت وضعیت
 * که عملیاتی و بدون نسخه است (۴.۱).
 */
export function WbsDetailPanel({ projectId, itemId, can, onSelect, descendantCount }: WbsDetailPanelProps) {
  const { data, isFetching, isError, error, refetch } = useGetWbsItemQuery(
    { projectId, itemId: itemId ?? '' },
    { skip: !itemId },
  );

  if (!itemId) {
    return (
      <EmptyState
        icon="mouse-pointer-click"
        title="آیتمی انتخاب نشده"
        description="روی یک ردیف درخت کلیک کنید تا پیشرفت، اقلام CBS متصل و گزارش‌های کارگاه آن را اینجا ببینید."
        style={{ margin: 'auto 0' }}
      />
    );
  }

  // تا دادهٔ آیتم تازه نرسیده، اسکلت — نه جزئیات آیتم قبلی
  if (!data || (isFetching && data.item.id !== itemId)) {
    if (isError) {
      const notFound = typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
      return (
        <EmptyState
          icon={notFound ? 'file-search' : 'server'}
          title={notFound ? 'این آیتم در ساختار فعلی نیست' : 'جزئیات بارگذاری نشد'}
          description={
            notFound
              ? 'ممکن است در بازنگری اخیر حذف یا جابه‌جا شده باشد. از درخت دوباره انتخاب کنید.'
              : 'چند لحظهٔ دیگر دوباره امتحان کنید.'
          }
          actions={
            notFound ? undefined : (
              <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={() => void refetch()}>
                تلاش دوباره
              </AppButton>
            )
          }
          style={{ margin: 'auto 0' }}
        />
      );
    }
    return <DetailSkeleton />;
  }

  return (
    <DetailBody
      key={data.item.id}
      projectId={projectId}
      detail={data}
      can={can}
      onSelect={onSelect}
      descendantCount={descendantCount(data.item.id)}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="col g12" style={{ padding: '14px 16px' }} aria-busy="true">
      <Skeleton width={72} height={18} />
      <Skeleton width="80%" height={16} />
      <Skeleton width="60%" />
      <SkeletonTable rows={4} />
    </div>
  );
}

const SECTION = { padding: '12px 16px', borderBottom: '1px solid #F4F4F5' } as const;

function DetailBody({
  projectId,
  detail,
  can,
  onSelect,
  descendantCount,
}: {
  projectId: EntityId;
  detail: WbsItemDetailDto;
  can: WbsPermissions;
  onSelect: (itemId: EntityId) => void;
  descendantCount: number;
}) {
  const { item } = detail;
  const progress = item.progress;
  const menu = buildWbsItemMenu(item, { projectId, can, descendantCount });

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* ── سرآیند ── */}
      <div className="col g8" style={SECTION}>
        <div className="row between">
          <Badge tone="neu" mono icon={item.isLeaf ? 'file-text' : 'folder'} style={{ fontSize: 11.5 }}>
            <span dir="ltr">{item.code}</span>
          </Badge>
          <span className="row g4">
            <IconButton icon="link-2" label="کپی پیوند آیتم" size="sm" onClick={() => copyItemLink(projectId, item.id)} />
            <Menu
              entries={menu}
              trigger={(props) => <IconButton {...props} icon="more-vertical" label="اقدامات بیشتر" size="sm" />}
            />
          </span>
        </div>

        {detail.path.length > 0 && (
          <nav className="row wrap g4 t-xs tx5" aria-label="جایگاه در درخت">
            {detail.path.map((entry, index) => (
              <span key={entry.id} className="row g4">
                {index > 0 && <Icon name="chevron-left" size={11} />}
                <button type="button" className="link t-xs" onClick={() => onSelect(entry.id)} title={entry.title}>
                  {entry.title}
                </button>
              </span>
            ))}
          </nav>
        )}

        <h2 className="h-t3">{item.title}</h2>

        <div className="row wrap g6">
          {progress && (
            <Badge tone={WBS_PROGRESS_STATUS_TONES[progress.status]} dot>
              {WBS_PROGRESS_STATUS[progress.status]}
            </Badge>
          )}
          {progress && progress.deviation !== 0 && (
            <Badge tone={WBS_PROGRESS_STATUS_TONES[progress.status]}>{formatDeviation(progress.deviation)} از برنامه</Badge>
          )}
          {item.isMilestone && (
            <Badge tone="acc" icon="flag">
              نقطهٔ عطف
            </Badge>
          )}
          {item.isCritical && (
            <Badge tone="neu" icon="git-branch" title="از برنامهٔ MSP">
              مسیر بحرانی
            </Badge>
          )}
          {can.viewRisks && detail.openRiskCount > 0 && (
            <Link to={WBS_DEEP_LINKS.risks(projectId, item.id)} className="bdg acc">
              <Icon name="shield-alert" size={11} />
              {toFaDigits(detail.openRiskCount)} ریسک باز
            </Link>
          )}
        </div>

        <StatusNote projectId={projectId} item={item} canEdit={can.editNote} />
      </div>

      {/* ── مشخصات ── */}
      <KeyValueGrid columns={2} style={{ ...SECTION, gap: 12 }}>
        <KeyValue label="وزن در والد" value={formatPercentAuto(item.weightInParent, 2)} />
        <KeyValue label="وزن در پروژه" value={formatPercentAuto(item.weightInProject, 2)} />
        {item.isLeaf ? (
          <LeafFacts item={item} />
        ) : (
          <>
            <KeyValue label="فرزندان" value={`${toFaDigits(detail.childCount)} آیتم`} />
            <KeyValue label="برگ‌های زیرشاخه" value={toFaDigits(detail.leafCountBelow)} />
          </>
        )}
        <KeyValue label="شروع برنامه‌ای" value={formatJalaliDate(item.plannedStart)} />
        <KeyValue label="پایان برنامه‌ای" value={formatJalaliDate(item.plannedFinish)} />
        {progress?.forecastFinish && progress.forecastFinish !== item.plannedFinish && (
          <KeyValue
            label="پایان پیش‌بینی‌شده"
            value={<span className="tx-wrn">{formatJalaliDate(progress.forecastFinish)}</span>}
          />
        )}
        {can.viewAmounts && progress?.bac && <KeyValue label="بودجه (BAC)" value={<Amount value={progress.bac} />} />}
      </KeyValueGrid>
      {!item.isLeaf && (
        <p className="t-xs tx5" style={{ padding: '0 16px 10px', margin: 0 }}>
          تاریخ‌ها و پیشرفت والد از فرزندانش ساخته می‌شود.
        </p>
      )}

      {/* ── پیشرفت ── */}
      {progress ? (
        <div className="col g8" style={SECTION}>
          <div className="row between t-sm tx6">
            <span>برنامه‌ای تا {formatJalaliDate(progress.dataDate)}</span>
            <strong className="num-i tx9">{formatPercentAuto(progress.plannedPercent)}</strong>
          </div>
          <ProgressBar value={progress.plannedPercent} color="#A1A1AA" label="پیشرفت برنامه‌ای" style={{ flex: '0 0 auto' }} />
          <div className="row between t-sm tx6">
            <span>{item.isLeaf ? 'واقعی (آخرین گزارش تأییدشده)' : 'واقعی (تجمیع وزنی فرزندان)'}</span>
            <strong className="num-i" style={{ color: STATUS_COLOR[progress.status] }}>
              {formatPercentAuto(progress.actualPercent)}
            </strong>
          </div>
          <ProgressBar
            value={progress.actualPercent}
            color={STATUS_COLOR[progress.status]}
            label="پیشرفت واقعی"
            style={{ flex: '0 0 auto' }}
          />
          {(progress.pendingPercent != null || progress.lastApprovedAt) && (
            <span className="t-xs tx5">
              {progress.pendingPercent != null && <>در انتظار تأیید: {formatPercentAuto(progress.pendingPercent)} · </>}
              {progress.lastApprovedAt && <>آخرین تأیید {formatJalaliDateTime(progress.lastApprovedAt)}</>}
            </span>
          )}
          {item.measurementMethod === 'time_based' && (
            <span className="t-xs tx5">
              پیشرفت زمانی: واقعی برابر برنامه‌ای از تاریخ‌های نسخهٔ جاری است و گزارش کارگاه نمی‌گیرد.
            </span>
          )}
        </div>
      ) : (
        <div className="col g4" style={SECTION}>
          <span className="t-sm tx6">پیشرفت پس از فعال‌سازی پروژه محاسبه می‌شود.</span>
        </div>
      )}

      {detail.stepsProgress && <StepsSection steps={detail.stepsProgress} />}

      {item.isLeaf && can.viewCbs && (
        <CbsSection projectId={projectId} item={item} links={detail.cbsLinks} canViewAmounts={can.viewAmounts} />
      )}

      {item.isLeaf && can.viewReports && isReportable(item) && progress && (
        <ReportsSection projectId={projectId} item={item} reports={detail.reports} />
      )}

      <DetailActions projectId={projectId} item={item} can={can} />
    </div>
  );
}

function LeafFacts({ item }: { item: WbsItemDto }) {
  const method = item.measurementMethod;
  return (
    <>
      <KeyValue label="روش اندازه‌گیری" value={method ? LEAF_MEASUREMENT_METHODS[method] : '—'} />
      {item.totalQuantity ? (
        <KeyValue label="مقدار کل" value={formatQuantity(item.totalQuantity, item.unit)} />
      ) : (
        <KeyValue label="مقدار کل" value={<span className="tx5">—</span>} />
      )}
      {method === 'quantity' && item.progress?.actualQuantity != null && (
        <KeyValue label="انجام‌شده (تأییدشده)" value={formatQuantity(Math.round(item.progress.actualQuantity * 10) / 10, item.unit)} />
      )}
      {method !== 'time_based' && (
        <KeyValue
          label="سرپرست"
          value={
            item.supervisor ? (
              <span className="row g6">
                <Avatar size="s" name={item.supervisor.fullName} tone={item.supervisor.avatarTone} />
                {item.supervisor.fullName}
              </span>
            ) : (
              <span className="tx-wrn">تخصیص‌نیافته</span>
            )
          }
        />
      )}
    </>
  );
}

function Amount({ value }: { value: string }) {
  const parts = formatRialParts(value);
  return (
    <span className="nowrap">
      {parts.value} <span className="tx5 t-sm">{parts.unit}</span>
    </span>
  );
}

// ── یادداشت وضعیت (عملیاتی، `wbs.edit_note`) ──

function StatusNote({ projectId, item, canEdit }: { projectId: EntityId; item: WbsItemDto; canEdit: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.statusNote ?? '');
  const [save, saveState] = useUpdateWbsStatusNoteMutation();
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // فوکوس به ویرایشگر تازه‌باز — جای autoFocus که خواننده‌های صفحه را گیج می‌کند
  useEffect(() => {
    if (isEditing) fieldRef.current?.focus();
  }, [isEditing]);

  async function submit() {
    try {
      await save({ projectId, itemId: item.id, statusNote: draft.trim() || null }).unwrap();
      setIsEditing(false);
    } catch {
      // خطا را میان‌افزار سراسری نشان می‌دهد؛ ویرایشگر باز می‌ماند
    }
  }

  if (isEditing) {
    return (
      <div className="col g6">
        <label className="lbl" htmlFor={`note-${item.id}`}>
          یادداشت وضعیت
        </label>
        <TextArea
          id={`note-${item.id}`}
          rows={3}
          maxLength={500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="مثلاً دلیل تأخیر و کاری که در جریان است"
          ref={fieldRef}
        />
        <div className="row between">
          <span className="t-xs tx5">{toFaDigits(draft.length)} از ۵۰۰ · بدون نسخه؛ همه می‌بینند</span>
          <span className="row g6">
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(item.statusNote ?? '');
                setIsEditing(false);
              }}
            >
              انصراف
            </AppButton>
            <AppButton variant="primary" size="sm" icon="check" loading={saveState.isLoading} onClick={() => void submit()}>
              ذخیرهٔ یادداشت
            </AppButton>
          </span>
        </div>
      </div>
    );
  }

  if (!item.statusNote) {
    return canEdit ? (
      <button type="button" className="link t-12 row g4" style={{ alignSelf: 'flex-start' }} onClick={() => setIsEditing(true)}>
        <Icon name="plus" size={12} />
        افزودن یادداشت وضعیت
      </button>
    ) : null;
  }

  return (
    <div className="row g6 ai-s">
      <p className="t-12 tx6 lh grow" style={{ margin: 0 }}>
        {item.statusNote}
      </p>
      {canEdit && (
        <IconButton
          icon="pencil"
          label="ویرایش یادداشت وضعیت"
          size="sm"
          onClick={() => {
            setDraft(item.statusNote ?? '');
            setIsEditing(true);
          }}
        />
      )}
    </div>
  );
}

// ── گام‌ها ──

function StepsSection({ steps }: { steps: NonNullable<WbsItemDetailDto['stepsProgress']> }) {
  return (
    <div className="col g8" style={SECTION}>
      <span className="t-13 fw6 row g6">
        <Icon name="list-checks" size={14} />
        گام‌ها
      </span>
      {steps.map((step) => (
        <div key={step.key} className="col g4">
          <div className="row between t-12">
            <span className="tx8">
              {step.title} <span className="tx5">· وزن {formatPercentAuto(step.weight, 2)}</span>
            </span>
            <strong className="num-i tx9">{formatPercentAuto(step.approvedPercent)}</strong>
          </div>
          <ProgressBar size="thin" value={step.approvedPercent} color="#2C4A73" style={{ flex: '0 0 auto' }} />
        </div>
      ))}
      <span className="t-xs tx5">درصد برگ = جمع وزن × آخرین درصد تأییدشدهٔ هر گام ÷ ۱۰۰</span>
    </div>
  );
}

// ── اقلام CBS متصل (تصمیم 1405/08/15: سهم برگ + مصرف کل قلم؛ AC برگ وجود ندارد، OD-01) ──

function CbsSection({
  projectId,
  item,
  links,
  canViewAmounts,
}: {
  projectId: EntityId;
  item: WbsItemDto;
  links: WbsLinkedCbsDto[];
  canViewAmounts: boolean;
}) {
  return (
    <div className="col g6" style={SECTION}>
      <SectionHeader
        icon="link-2"
        title="اقلام CBS متصل"
        action={
          <Link className="link" to={WBS_DEEP_LINKS.links(projectId, item.id)} style={{ fontSize: 12 }}>
            مدیریت
          </Link>
        }
      />
      {links.length === 0 ? (
        <span className="t-12 tx-wrn row g6">
          <Icon name="alert-triangle" size={13} />
          به هیچ قلم هزینه‌ای وصل نیست؛ BAC و EV این آیتم صفر است (AL-STR-01).
        </span>
      ) : (
        links.map((link) => (
          <div key={link.linkId} className="row between box g8" style={{ padding: '8px 10px' }}>
            <span className="col g4" style={{ minWidth: 0 }}>
              <span className="row g8" style={{ minWidth: 0 }}>
                <CostTypeTag type={link.costType} />
                <span className="t-12 tx8 trunc" title={link.title}>
                  {link.title}
                </span>
              </span>
              <span className="mono t-xs tx5" dir="ltr" style={{ alignSelf: 'flex-end' }}>
                {link.code}
              </span>
            </span>
            <span className="col g2 ai-e nowrap t-sm">
              {canViewAmounts && link.subBudget && (
                <span className="tx7" title="زیربودجهٔ همین اتصال">
                  سهم: <strong className="tx9">{formatRialParts(link.subBudget).value}</strong>{' '}
                  {formatRialParts(link.subBudget).unit}
                </span>
              )}
              {link.cbsConsumedPercent != null && (
                <span
                  className={link.cbsConsumedPercent >= 100 ? 'tx-err' : link.cbsAlertSeverity ? 'tx-wrn' : 'tx6'}
                  title="AC قلم ÷ بودجهٔ کل قلم — در نسخهٔ اول هزینهٔ واقعی در سطح برگ ثبت نمی‌شود"
                >
                  مصرف کل قلم {formatPercentAuto(link.cbsConsumedPercent)}
                </span>
              )}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ── گزارش‌های کارگاه ──

function ReportsSection({
  projectId,
  item,
  reports,
}: {
  projectId: EntityId;
  item: WbsItemDto;
  reports: WbsItemDetailDto['reports'];
}) {
  // W40 از آیتم در انتظار برگ (تصمیم 1405/08/15)
  const [quick, setQuick] = useState<WbsReportItemSummaryDto | null>(null);
  return (
    <div className="col g6" style={SECTION}>
      {quick && <QuickApproveDialog projectId={projectId} reportId={quick.reportId} itemId={quick.id} onClose={() => setQuick(null)} />}
      <SectionHeader
        icon="clipboard-check"
        title="گزارش‌های کارگاه"
        action={
          reports.total > 0 ? (
            <Link className="link" to={WBS_DEEP_LINKS.reports(projectId, item.id)} style={{ fontSize: 12 }}>
              همه ({toFaDigits(reports.total)})
            </Link>
          ) : undefined
        }
      />
      {reports.recent.length === 0 ? (
        <span className="t-12 tx5">هنوز گزارشی برای این آیتم ثبت نشده است.</span>
      ) : (
        reports.recent.map((report) => <ReportRow key={report.id} report={report} onReview={() => setQuick(report)} />)
      )}
    </div>
  );
}

function ReportRow({ report, onReview }: { report: WbsReportItemSummaryDto; onReview: () => void }) {
  const reviewable = report.status === 'stage1' || report.status === 'stage2';
  const isToday = report.workDate === todayIso();
  const summary =
    report.status === 'needs_revision' || report.status === 'rejected'
      ? (report.reviewNote ?? `${formatPercentAuto(report.fromPercent)} ← ${formatPercentAuto(report.toPercent)}`)
      : `${formatPercentAuto(report.fromPercent)} ← ${formatPercentAuto(report.toPercent)}${
          report.submittedBy ? ` · ${report.submittedBy.fullName}` : ''
        }`;

  return (
    <div className="row g8 t-12">
      <Badge size="sm" tone={FIELD_REPORT_ITEM_STATUS_TONES[report.status]}>
        {FIELD_REPORT_ITEM_STATUS[report.status]}
      </Badge>
      <span className="grow tx8 trunc" title={summary}>
        {summary}
      </span>
      <span className="tx5 t-sm nowrap">{isToday ? 'امروز' : formatJalaliDate(report.workDate)}</span>
      {reviewable && (
        <button type="button" className="link t-12 nowrap" onClick={onReview}>
          بررسی
        </button>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, action }: { icon: 'link-2' | 'clipboard-check'; title: string; action?: ReactNode }) {
  return (
    <div className="row between">
      <span className="t-13 fw6 row g6">
        <Icon name={icon} size={14} />
        {title}
      </span>
      {action}
    </div>
  );
}

// ── دکمه‌های پایین پنل ──

/**
 * W11 حالت مشاهده است: دکمه‌ها به ویژگی مالک هر کار می‌روند (تصمیم 1405/08/15) و
 * آیتم را همراه می‌برند — گزارش دستی F09 (G10)، تخصیص F07، ریسک F14، حذف در
 * نسخهٔ کاری F04/W12.
 */
function DetailActions({ projectId, item, can }: { projectId: EntityId; item: WbsItemDto; can: WbsPermissions }) {
  const reportable = isReportable(item);
  const buttons: ReactNode[] = [];

  if (item.isLeaf) {
    if (can.manualEntry && reportable) {
      buttons.push(
        <LinkButton key="manual" to={WBS_DEEP_LINKS.manualReport(projectId, item.id)} variant="primary" size="sm" icon="file-pen-line" className="grow">
          ثبت گزارش دستی
        </LinkButton>,
      );
    }
    if (can.assign && reportable) {
      buttons.push(
        <LinkButton key="assign" to={WBS_DEEP_LINKS.assignment(projectId, item.id)} variant="outline" size="sm" icon="user-plus" className="grow">
          {item.supervisor ? 'تغییر سرپرست' : 'تخصیص سرپرست'}
        </LinkButton>,
      );
    }
    if (can.createRisk) {
      buttons.push(
        <LinkButton key="risk" to={WBS_DEEP_LINKS.newRisk(projectId, item.id)} variant="outline" size="sm" icon="shield-alert" className="grow">
          ثبت ریسک
        </LinkButton>,
      );
    }
  } else if (can.editStructure) {
    buttons.push(
      <LinkButton key="child" to={ROUTES.wbsEdit(projectId, item.id)} variant="outline" size="sm" icon="plus" className="grow">
        افزودن فرزند
      </LinkButton>,
    );
  }

  if (can.editStructure) {
    buttons.push(
      <LinkButton
        key="delete"
        to={ROUTES.wbsEdit(projectId, item.id)}
        variant="dangerOutline"
        size="sm"
        icon="trash-2"
        className="grow"
        title="حذف در نسخهٔ کاری انجام می‌شود؛ گزارش‌های ثبت‌شده می‌مانند"
      >
        {item.isLeaf ? 'حذف' : 'حذف شاخه'}
      </LinkButton>,
    );
  }

  if (buttons.length === 0) return null;

  const rows: ReactNode[][] = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));

  return (
    <div
      className="col g6"
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #F4F4F5',
        marginTop: 'auto',
        background: '#FFFFFF',
        position: 'sticky',
        bottom: 0,
      }}
    >
      {rows.map((row, index) => (
        <div key={index} className="row g6">
          {row}
        </div>
      ))}
    </div>
  );
}
