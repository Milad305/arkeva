import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Skeleton } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { Icon } from '@/shared/components/ui/Icon';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { formatPercentAuto, formatRatio, toFaDigits } from '@/shared/utils/num';
import { COST_TYPE_LABELS, type CostType } from '@/shared/types/tone';
import type { ProjectDetailDto } from '@/modules/projects/types';
import type { CbsPermissions } from '../hooks/useCbsPermissions';
import { activeCbsFilterCount, EMPTY_CBS_FILTERS, type CbsFilters, type CbsQuickFilter } from '../services/cbsView';
import type { BudgetRevisionRequestDto, CbsSummaryDto, CbsTreeDto } from '../types';
import { DecideRevisionDialog } from './DecideRevisionDialog';
import { Money } from './Money';

export interface CbsSidePaneProps {
  project: ProjectDetailDto;
  can: CbsPermissions;
  tree: CbsTreeDto | undefined;
  isLoading: boolean;
  filters: CbsFilters;
  onFiltersChange: (filters: CbsFilters) => void;
  revisions: BudgetRevisionRequestDto[] | undefined;
  onSelectItem: (itemId: string) => void;
  onExport: () => void;
  isExporting: boolean;
}

/** متغیرهای رنگ `--cost-*` توکن‌ها. */
const COST_TYPE_VAR: Record<CostType, string> = {
  materials: 'material',
  labor: 'labor',
  equipment: 'equip',
  subcontract: 'sub',
  overhead: 'overhead',
  transport: 'transport',
  other: 'overhead',
};

const COST_TYPES: CostType[] = ['materials', 'labor', 'equipment', 'subcontract', 'transport', 'overhead', 'other'];

/** پنل کناری W14 — خلاصهٔ بودجه (cbs.md ۶.۱)، فیلترها (۱۲)، درخواست‌های بازنگری (G14) و خروجی. */
export function CbsSidePane({
  project,
  can,
  tree,
  isLoading,
  filters,
  onFiltersChange,
  revisions,
  onSelectItem,
  onExport,
  isExporting,
}: CbsSidePaneProps) {
  const set = (patch: Partial<CbsFilters>) => onFiltersChange({ ...filters, ...patch });
  const active = activeCbsFilterCount(filters);
  const counts = tree?.summary.counts;
  const presentTypes = new Set(tree?.items.map((item) => item.costType) ?? []);
  const typeOptions: Array<SelectOption<'all' | CostType>> = [
    { value: 'all', label: 'همهٔ انواع' },
    ...COST_TYPES.filter((type) => presentTypes.has(type)).map((type) => ({ value: type, label: COST_TYPE_LABELS[type] })),
  ];

  const quick: Array<{ key: CbsQuickFilter; label: string; count?: number; hidden?: boolean }> = [
    { key: 'all', label: 'همه' },
    { key: 'over90', label: 'مصرف بالای ۹۰٪', count: counts?.consumptionOver90 },
    { key: 'overBudget', label: 'پیش‌بینی فراتر از بودجه', count: counts?.forecastOverBudget, hidden: !can.viewAmounts },
    { key: 'unlinked', label: 'بدون اتصال WBS', count: counts?.unlinked },
  ];

  return (
    <>
      <div className="col g8">
        <span className="sect-t">جستجو</span>
        <TextInput
          size="sm"
          icon="search"
          type="search"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
          placeholder="عنوان یا کد قلم…"
          aria-label="جستجو در CBS"
        />
      </div>

      <div className="col g8">
        <div className="row between">
          <span className="sect-t">فیلترها</span>
          {active > 0 && (
            <button type="button" className="link t-xs" onClick={() => onFiltersChange(EMPTY_CBS_FILTERS)}>
              پاک کردن
            </button>
          )}
        </div>
        <div className="row wrap g6" role="group" aria-label="فیلتر سریع">
          {quick
            .filter((entry) => !entry.hidden)
            .map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={filters.quick === entry.key ? 'chip on' : 'chip'}
                aria-pressed={filters.quick === entry.key}
                onClick={() => set({ quick: entry.key })}
              >
                {entry.label}
                {entry.count !== undefined && <span className="num-i">{toFaDigits(entry.count)}</span>}
              </button>
            ))}
        </div>
        <div className="fg">
          <span className="t-sm tx6 fw5">نوع هزینه</span>
          <Select size="sm" label="فیلتر نوع هزینه" options={typeOptions} value={filters.costType} onChange={(costType) => set({ costType })} />
        </div>
      </div>

      {can.editDraft && (
        <Link className="box row between" to={ROUTES.cbsEdit(project.id)} style={{ background: '#FFFFFF' }}>
          <span className="row g8">
            <span className="tx6" style={{ display: 'inline-flex' }}>
              <Icon name="pencil" size={14} />
            </span>
            <span className="col">
              <span className="t-13 fw5">حالت ویرایش</span>
              <span className="t-xs tx5">
                {project.status === 'draft' ? 'اقلام، نرخ و مقدار مبنای کاری' : 'قلم جدید و تغییر ساختار در نسخهٔ کاری'}
              </span>
            </span>
          </span>
          <span className="sw" aria-hidden="true" />
        </Link>
      )}

      {can.viewAmounts && <BudgetSummary summary={tree?.summary} isLoading={isLoading || !tree} costIndicesDate={tree?.costIndicesDate ?? null} />}

      {tree && tree.summary.byType.length > 0 && (
        <div className="col g8">
          <span className="sect-t">سهم انواع هزینه</span>
          <div className="row" style={{ height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }} aria-hidden="true">
            {tree.summary.byType.map((entry) => (
              <span key={entry.costType} style={{ flex: `${entry.percent} 0 0`, background: `var(--cost-${COST_TYPE_VAR[entry.costType]})` }} />
            ))}
          </div>
          <div className="col g4">
            {tree.summary.byType.map((entry) => (
              <div key={entry.costType} className="row between t-12">
                <CostTypeTag type={entry.costType} />
                <span className="num-i tx7">{formatPercentAuto(entry.percent)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {revisions && revisions.length > 0 && <PendingRevisions projectId={project.id} revisions={revisions} onSelectItem={onSelectItem} canViewAmounts={can.viewAmounts} canApprove={can.approveRevision} />}

      {can.exportExcel && (
        <div className="col g4">
          <span className="sect-t" style={{ marginBottom: 4 }}>
            Excel
          </span>
          <AppButton variant="ghost" size="sm" block icon="file-down" style={{ justifyContent: 'flex-start' }} onClick={onExport} loading={isExporting}>
            خروجی Excel
          </AppButton>
        </div>
      )}
    </>
  );
}

function BudgetSummary({ summary, isLoading, costIndicesDate }: { summary: CbsSummaryDto | undefined; isLoading: boolean; costIndicesDate: string | null }) {
  if (isLoading || !summary) {
    return (
      <div className="box col g8">
        <Skeleton width="80%" />
        <Skeleton width="70%" />
        <Skeleton width="75%" />
      </div>
    );
  }
  const unallocated = BigInt(summary.unallocated ?? '0');
  return (
    <div className="col g8">
      <span className="sect-t">خلاصهٔ بودجه</span>
      <div className="box col g8">
        <Row label="بودجهٔ کل" hint="بودجهٔ CBS + ذخیرهٔ احتیاطی" value={<Money value={summary.totalBudget} className="t-12 fw6 tx9" />} />
        <Row label="بودجهٔ CBS" value={<Money value={summary.cbsBudget} />} />
        <Row label="BAC" hint="جمع زیربودجهٔ اتصال‌ها" value={<Money value={summary.bac} className="t-12 fw6 tx9" />} />
        <Row
          label="تخصیص‌نیافته"
          value={unallocated > 0n ? <Money value={summary.unallocated} className="t-12 fw6 tx-wrn" /> : <span className="t-12 tx-ok">ندارد</span>}
        />
        <Row label="ذخیرهٔ احتیاطی" value={<Money value={summary.contingencyReserve} />} />
        <span className="hr" />
        <Row label="هزینهٔ واقعی (AC)" value={<Money value={summary.ac} />} />
        <Row label="پیش‌بینی پروژه (EAC)" hint="از CPI کل پروژه، نه جمع قلم‌ها" value={<Money value={summary.projectEac} className="t-12 fw6 tx9" />} />
        {summary.projectCpi !== null && (
          <Row
            label="CPI پروژه"
            value={<strong className={summary.projectCpi < 1 ? 'num-i t-12 tx-wrn' : 'num-i t-12 tx-ok'}>{formatRatio(summary.projectCpi, 4)}</strong>}
          />
        )}
        {costIndicesDate && (
          <>
            <span className="hr" />
            <span className="t-xs tx5">هزینه تا پایان {formatJalaliDate(costIndicesDate)}</span>
          </>
        )}
      </div>
      {unallocated > 0n && (
        <span className="row g6 ai-s t-xs tx-wrn">
          <Icon name="alert-triangle" size={12} />
          بخشی از بودجهٔ CBS به هیچ فعالیتی تخصیص نیافته و در BAC نیست (AL-STR-02).
        </span>
      )}
    </div>
  );
}

function Row({ label, hint, value }: { label: string; hint?: string; value: React.ReactNode }) {
  return (
    <div className="row between g8 t-12 tx7">
      <span title={hint}>{label}</span>
      {value}
    </div>
  );
}

const STATUS_LABEL = { pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده', applied: 'اعمال‌شده', withdrawn: 'پس‌گرفته' } as const;

/**
 * فهرست درخواست‌های بازنگری در انتظار (G14). دارندهٔ `cbs.approve_revision` از همین‌جا
 * تأیید یا رد می‌کند (تصمیم 1405/08/15)؛ تصمیم‌های اخیر هم برای پیگیری دیده می‌شوند.
 */
function PendingRevisions({
  projectId,
  revisions,
  onSelectItem,
  canViewAmounts,
  canApprove,
}: {
  projectId: string;
  revisions: BudgetRevisionRequestDto[];
  onSelectItem: (itemId: string) => void;
  canViewAmounts: boolean;
  canApprove: boolean;
}) {
  const [deciding, setDeciding] = useState<BudgetRevisionRequestDto | null>(null);
  const pending = revisions.filter((request) => request.status === 'pending');
  const decided = revisions.filter((request) => request.status !== 'pending').slice(0, 3);
  if (pending.length === 0 && decided.length === 0) return null;
  return (
    <div className="col g8">
      <div className="row between">
        <span className="sect-t">درخواست‌های بازنگری</span>
        {pending.length > 0 && (
          <Badge size="sm" tone="wrn">
            {toFaDigits(pending.length)} {STATUS_LABEL.pending}
          </Badge>
        )}
      </div>
      {pending.map((request) => (
        <div key={request.id} className="box col g6" style={{ padding: '10px 12px' }}>
          <div className="row between t-xs tx5">
            <span>{request.requestedBy.fullName}</span>
            <span>{formatJalaliDateTime(request.requestedAt)}</span>
          </div>
          {request.changes.map((change, index) => (
            <button key={index} type="button" className="row g6 t-12 link" style={{ textAlign: 'start' }} onClick={() => onSelectItem(change.cbsItemId)}>
              <span className="mono t-xs" dir="ltr">
                {change.cbsCode}
              </span>
              <span className="trunc">{change.cbsTitle}</span>
            </button>
          ))}
          <p className="t-12 tx7" style={{ margin: 0 }}>
            {request.reason}
          </p>
          {canViewAmounts && request.impact.budgetChange !== null && (
            <span className="t-xs tx6">
              اثر بر بودجه: <Money value={request.impact.budgetChange} className="t-xs tx8" />
            </span>
          )}
          {canApprove && (
            <AppButton variant="outline" size="sm" icon="check-circle-2" style={{ alignSelf: 'flex-start' }} onClick={() => setDeciding(request)}>
              بررسی و تصمیم
            </AppButton>
          )}
        </div>
      ))}
      {!canApprove && pending.length > 0 && <span className="t-xs tx5">مدیر پروژه درخواست را تأیید یا رد می‌کند.</span>}
      {decided.map((request) => (
        <div key={request.id} className="row between g8 t-xs tx6">
          <span className="trunc">
            {request.changes[0]?.cbsTitle} — {STATUS_LABEL[request.status]}
            {request.decisionNote ? ` («${request.decisionNote}»)` : ''}
          </span>
          <Badge size="sm" tone={request.status === 'rejected' ? 'err' : 'ok'}>
            {STATUS_LABEL[request.status]}
          </Badge>
        </div>
      ))}
      {deciding && <DecideRevisionDialog projectId={projectId} request={deciding} onClose={() => setDeciding(null)} />}
    </div>
  );
}
