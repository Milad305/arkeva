import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { WBS_PROGRESS_STATUS, type WbsProgressStatus } from '@/config/constants';
import { Skeleton } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { ProjectDetailDto } from '@/modules/projects/types';
import type { PlanDraftValidationDto } from '@/modules/plan/types';
import type { WbsPermissions } from '../hooks/useWbsPermissions';
import {
  activeFilterCount,
  EMPTY_WBS_FILTERS,
  type WbsFilters,
  type WbsKindFilter,
  type WbsStatusFilter,
} from '../services/wbsTree';
import { downloadWbsTemplate } from '../services/wbsTemplate';
import type { WbsTreeDto } from '../types';

const STATUS_OPTIONS: Array<SelectOption<WbsStatusFilter>> = [
  { value: 'all', label: 'همهٔ وضعیت‌ها' },
  { value: 'delayed', label: 'تأخیردار (هشدار و بحرانی)', text: 'تأخیردار' },
  ...(['critical', 'warning', 'on_track', 'ahead', 'completed', 'not_started'] as WbsProgressStatus[]).map(
    (status) => ({ value: status as WbsStatusFilter, label: WBS_PROGRESS_STATUS[status] }),
  ),
];

const KIND_ITEMS: Array<{ key: WbsKindFilter; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'leaf', label: 'برگ‌ها' },
  { key: 'parent', label: 'والدها' },
];

export interface WbsFilterPaneProps {
  project: ProjectDetailDto;
  can: WbsPermissions;
  tree: WbsTreeDto | undefined;
  isLoading: boolean;
  filters: WbsFilters;
  onFiltersChange: (filters: WbsFilters) => void;
  supervisors: Array<{ id: string; fullName: string }>;
  validation: PlanDraftValidationDto | undefined;
  onExport: () => void;
  isExporting: boolean;
}

/** پنل کناری W11 — جستجو، فیلترها، حالت ویرایش، مدیریت ساختار و خلاصه. */
export function WbsFilterPane({
  project,
  can,
  tree,
  isLoading,
  filters,
  onFiltersChange,
  supervisors,
  validation,
  onExport,
  isExporting,
}: WbsFilterPaneProps) {
  const active = activeFilterCount(filters);
  const set = (patch: Partial<WbsFilters>) => onFiltersChange({ ...filters, ...patch });

  const supervisorOptions: Array<SelectOption<string>> = [
    { value: 'all', label: 'همهٔ سرپرستان' },
    { value: 'none', label: 'بدون سرپرست' },
    ...supervisors.map((person) => ({ value: person.id, label: person.fullName })),
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
          placeholder="عنوان یا کد آیتم…"
          aria-label="جستجو در WBS"
        />
      </div>

      <div className="col g8">
        <div className="row between">
          <span className="sect-t">فیلترها</span>
          {active > 0 && (
            <span className="row g6">
              <Badge size="sm" tone="neu">
                {toFaDigits(active)} فعال
              </Badge>
              <button type="button" className="link t-xs" onClick={() => onFiltersChange(EMPTY_WBS_FILTERS)}>
                پاک کردن
              </button>
            </span>
          )}
        </div>
        <div className="fg">
          <span className="t-sm tx6 fw5">وضعیت</span>
          <Select size="sm" label="فیلتر وضعیت" options={STATUS_OPTIONS} value={filters.status} onChange={(status) => set({ status })} />
        </div>
        <div className="fg">
          <span className="t-sm tx6 fw5">سرپرست</span>
          <Select
            size="sm"
            label="فیلتر سرپرست"
            options={supervisorOptions}
            value={filters.supervisor}
            onChange={(supervisor) => set({ supervisor })}
          />
        </div>
        <div className="fg">
          <span className="t-sm tx6 fw5">نوع آیتم</span>
          <SegmentedControl
            fill
            activeKey={filters.kind}
            items={KIND_ITEMS}
            onChange={(key) => set({ kind: key as WbsKindFilter })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {can.editStructure && (
        <Link className="box row between" to={ROUTES.wbsEdit(project.id)} style={{ background: '#FFFFFF' }}>
          <span className="row g8">
            <span className="tx6" style={{ display: 'inline-flex' }}>
              <Icon name="pencil" size={14} />
            </span>
            <span className="col">
              <span className="t-13 fw5">حالت ویرایش</span>
              <span className="t-xs tx5">
                {project.status === 'draft' ? 'ساختار، وزن و تاریخ مبنای کاری' : 'در نسخهٔ کاری؛ پس از اعمال رسمی می‌شود'}
              </span>
            </span>
          </span>
          <span className="sw" aria-hidden="true" />
        </Link>
      )}

      <StructureActions project={project} can={can} onExport={onExport} isExporting={isExporting} />

      <div className="col g8">
        <span className="sect-t">خلاصهٔ ساختار</span>
        {isLoading || !tree ? (
          <div className="box col g8">
            <Skeleton width="80%" />
            <Skeleton width="70%" />
            <Skeleton width="75%" />
          </div>
        ) : (
          <div className="box col g8">
            <SummaryRow icon="layers" label="کل آیتم‌ها" value={toFaDigits(tree.summary.totalItems)} />
            <SummaryRow icon="file-text" label="آیتم‌های برگ" value={toFaDigits(tree.summary.leafCount)} />
            <SummaryRow icon="folder" label="آیتم‌های والد" value={toFaDigits(tree.summary.parentCount)} />
            {tree.summary.milestoneCount > 0 && (
              <SummaryRow icon="flag" label="نقاط عطف" value={toFaDigits(tree.summary.milestoneCount)} />
            )}
            <span className="hr" />
            <div className="row between t-12 tx7">
              <span className="row g6">
                <Icon name="percent" size={13} />
                مجموع وزن ریشه
              </span>
              <strong className={tree.summary.rootWeightSum === 100 ? 'num-i tx-ok row g4' : 'num-i tx-err row g4'}>
                {formatPercentAuto(tree.summary.rootWeightSum, 2)}
                <Icon name={tree.summary.rootWeightSum === 100 ? 'check' : 'alert-triangle'} size={13} />
              </strong>
            </div>
            {validation && <UnbalancedRow project={project} validation={validation} />}
            {tree.dataDate && (
              <>
                <span className="hr" />
                <span className="t-xs tx5">پیشرفت تا پایان {formatJalaliDate(tree.dataDate)} (تاریخ داده)</span>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="row between t-12 tx7">
      <span className="row g6">
        <Icon name={icon} size={13} />
        {label}
      </span>
      <strong className="num-i tx9">{value}</strong>
    </div>
  );
}

/**
 * «وزن‌های نامتعادل» فقط وقتی نسخهٔ کاری باز است و از اعتبارسنجی F04 می‌آید
 * (`features/wbs.md` ۸). درخت جاری پروژهٔ فعال همیشه متعادل است (D05)؛ این عدد
 * دربارهٔ نسخهٔ کاری است.
 */
function UnbalancedRow({ project, validation }: { project: ProjectDetailDto; validation: PlanDraftValidationDto }) {
  const count = validation.errors.filter((issue) => issue.code === 'weight_sum').length;
  const scope = project.status === 'draft' ? 'مبنای کاری' : 'نسخهٔ کاری';

  return (
    <div className="row between t-12 tx7">
      <span className={count > 0 ? 'row g6 tx-err' : 'row g6'}>
        <Icon name={count > 0 ? 'alert-triangle' : 'check-circle-2'} size={13} />
        وزن‌های نامتعادل ({scope})
      </span>
      {count > 0 ? (
        <Link className="num-i tx-err fw6" to={ROUTES.wbsEdit(project.id)}>
          {toFaDigits(count)} مورد
        </Link>
      ) : (
        <strong className="num-i tx-ok">ندارد</strong>
      )}
    </div>
  );
}

/**
 * «مدیریت ساختار» بر اساس وضعیت پروژه (تصمیم 1405/08/15، `features/wbs.md` ۶):
 *   پیش‌نویس           ورود از MSP یا Excel (جایگزینی کامل یا افزودن)
 *   فعال، متصل به MSP   همگام‌سازی · خروجی به MSP؛ ورود Excel ندارد (مالک ساختار MSP است)
 *   فعال، بدون MSP     فقط «افزودن از Excel زیر یک آیتم» در بازنگری کاری
 *   همه                خروجی Excel و قالب خالی
 */
function StructureActions({
  project,
  can,
  onExport,
  isExporting,
}: {
  project: ProjectDetailDto;
  can: WbsPermissions;
  onExport: () => void;
  isExporting: boolean;
}) {
  const isDraft = project.status === 'draft';
  const isLive = project.status === 'active' || project.status === 'paused';
  const excelImport = can.editStructure && !project.mspLinked && (isDraft || isLive);
  const pending = project.counts.mspPendingChanges ?? 0;
  const start = { justifyContent: 'flex-start' } as const;

  const hasAny = can.mspImport || excelImport || can.mspSync || can.mspExport || can.exportExcel;
  if (!hasAny) return null;

  return (
    <div className="col g4">
      <span className="sect-t" style={{ marginBottom: 4 }}>
        مدیریت ساختار
      </span>

      {can.mspImport && (
        <LinkButton to={`${ROUTES.mspImport}?project=${project.id}`} variant="outline" size="sm" block icon="upload" style={start}>
          ورود از MSP (XML / MPP)
        </LinkButton>
      )}
      {excelImport && (
        <LinkButton
          to={ROUTES.wbsImport(project.id, isDraft ? undefined : 'append')}
          variant={can.mspImport ? 'ghost' : 'outline'}
          size="sm"
          block
          icon="file-spreadsheet"
          style={start}
        >
          {isDraft ? 'ورود از Excel' : 'افزودن از Excel زیر یک آیتم'}
        </LinkButton>
      )}
      {can.mspSync && (
        <LinkButton to={ROUTES.mspSync(project.id)} variant="ghost" size="sm" block icon="refresh-cw" style={start}>
          همگام‌سازی با MSP
          {pending > 0 && (
            <Badge size="sm" tone="wrn" className="ms-auto">
              {toFaDigits(pending)} تغییر
            </Badge>
          )}
        </LinkButton>
      )}
      {can.mspExport && (
        <LinkButton to={ROUTES.mspExport(project.id)} variant="ghost" size="sm" block icon="file-code-2" style={start}>
          خروجی به MSP (XML)
        </LinkButton>
      )}
      {can.exportExcel && (
        <AppButton variant="ghost" size="sm" block icon="file-down" style={start} onClick={onExport} loading={isExporting}>
          خروجی Excel
        </AppButton>
      )}
      {(excelImport || can.mspImport) && (
        <AppButton variant="ghost" size="sm" block icon="file-spreadsheet" style={start} onClick={downloadWbsTemplate}>
          دانلود قالب Excel
        </AppButton>
      )}
    </div>
  );
}
