import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { RISK_LEVEL, RISK_STATUS, RISK_STATUS_TONES, type RiskStatus } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Chip } from '@/shared/components/ui/Chip';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, todayIso } from '@/shared/utils/date';
import { formatRial, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useGetRiskRegisterQuery } from '../api/risksApi';
import { exportRisks } from '../services/risksExport';
import { categoryColor, STRATEGY_LABEL } from '../services/riskView';
import type { RiskListItemDto } from '../types';
import { RiskFormDialog } from './RiskFormDialog';
import { RiskLegend, RiskMatrix } from './RiskMatrix';

type StatusFilter = 'open' | 'occurred' | 'closed' | 'all';
const OPEN: RiskStatus[] = ['identified', 'assessed', 'in_action'];
const STATUS_FILTERS: Array<[StatusFilter, string]> = [
  ['open', 'باز'],
  ['occurred', 'رخ‌داده'],
  ['closed', 'بسته‌شده'],
  ['all', 'همه'],
];

const normalize = (value: string) => value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

export interface RiskRegisterViewProps {
  /** پروژهٔ جاری؛ `null` = دفتر سراسری همهٔ پروژه‌های قابل‌مشاهده (تصمیم 1405/08/15). */
  project: { id: EntityId; name: string; code: string; status: string } | null;
}

/**
 * W18 — دفتر ریسک (risk.md ۷): KPI، ماتریس ۵×۵ با فیلتر خانه، توزیع دسته و هشدار اقدام
 * معوق، و فهرست با جستجو و فیلتر. همهٔ اعداد را سرور می‌دهد (D07). ثبت ریسک (W44) با
 * `?new=1&wbsItem=` از W11 هم باز می‌شود.
 */
export function RiskRegisterView({ project }: RiskRegisterViewProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const canCreate = useHasPermission('risk.create') && project !== null && project.status !== 'archived';
  const query = useGetRiskRegisterQuery({ projectId: project?.id ?? null, canViewAmounts });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [category, setCategory] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [cell, setCell] = useState<{ probability: number; impact: number } | null>(null);
  const wbsItem = params.get('wbsItem');
  const creating = params.get('new') === '1' && canCreate;

  const data = query.data;
  const today = todayIso();
  const rows = useMemo(() => {
    const term = normalize(search);
    return (data?.items ?? [])
      .filter((risk) => (status === 'all' ? true : status === 'open' ? OPEN.includes(risk.status) : risk.status === status))
      .filter((risk) => category === 'all' || risk.category === category)
      .filter((risk) => projectFilter === 'all' || risk.projectId === projectFilter)
      .filter((risk) => !cell || (risk.probability === cell.probability && risk.impact === cell.impact))
      .filter((risk) => !wbsItem || risk.wbsItemIds.includes(wbsItem))
      .filter((risk) => !term || normalize(`${risk.code} ${risk.title} ${risk.owner.fullName} ${risk.linkSummary.text}`).includes(term))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.code.localeCompare(b.code));
  }, [data, search, status, category, projectFilter, cell, wbsItem]);

  const detailPath = (risk: RiskListItemDto) => ROUTES.riskDetail(risk.projectId, risk.id);
  const clearParam = (...keys: string[]) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        keys.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );

  const columns: Array<Column<RiskListItemDto>> = [
    {
      key: 'code',
      header: 'شناسه',
      width: 84,
      render: (risk) => <span className="mono t-12 tx7">{risk.code}</span>,
    },
    {
      key: 'title',
      header: 'عنوان ریسک',
      minWidth: 240,
      render: (risk) => (
        <span className="col g2">
          <Link className="fw6 tx9" to={detailPath(risk)} onClick={(event) => event.stopPropagation()}>
            {risk.title}
          </Link>
          <span className="t-xs tx5 row g4">
            {risk.source === 'field' && <Icon name="hard-hat" size={11} />}
            {risk.linkSummary.text}
          </span>
        </span>
      ),
    },
    ...(project === null
      ? [{ key: 'project', header: 'پروژه', minWidth: 140, render: (risk: RiskListItemDto) => <span className="t-12 tx7">{risk.projectName}</span> }]
      : []),
    {
      key: 'category',
      header: 'دسته',
      minWidth: 80,
      render: (risk) => (
        <span className="row g6 t-12">
          <span className="dot" style={{ color: categoryColor(risk.category) }} />
          {risk.category}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'امتیاز',
      minWidth: 96,
      render: (risk) =>
        risk.score !== null && risk.level ? (
          <span className="row g6">
            <span className="fw7 tx9" style={{ minWidth: 18 }}>{toFaDigits(risk.score)}</span>
            <Badge size="sm" tone={risk.level === 'low' ? 'pri' : risk.level === 'medium' ? 'wrn' : 'err'}>
              {RISK_LEVEL[risk.level]}
            </Badge>
          </span>
        ) : (
          <span className="t-12 tx5">ارزیابی‌نشده</span>
        ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      minWidth: 96,
      render: (risk) => <Badge tone={RISK_STATUS_TONES[risk.status]}>{RISK_STATUS[risk.status]}</Badge>,
    },
    {
      key: 'response',
      header: 'پاسخ',
      minWidth: 200,
      render: (risk) => (
        <span className="t-12 tx7 lh">
          {risk.responseSummary ?? (risk.responseStrategy ? STRATEGY_LABEL[risk.responseStrategy] : <span className="tx5">بدون اقدام</span>)}
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'مالک',
      minWidth: 130,
      render: (risk) => (
        <span className="row g6 t-12">
          <Avatar name={risk.owner.fullName} tone={risk.owner.avatarTone ?? 'a1'} size="s" />
          {risk.owner.fullName}
        </span>
      ),
    },
    {
      key: 'due',
      header: 'موعد بعدی',
      minWidth: 96,
      render: (risk) =>
        risk.nextDueDate ? (
          <span className={`t-12 row g4 ${risk.hasOverdueAction ? 'tx-err fw6' : risk.nextDueDate <= today ? 'tx-wrn' : 'tx7'}`}>
            {risk.hasOverdueAction && <Icon name="alert-circle" size={12} />}
            {formatJalaliDate(risk.nextDueDate)}
          </span>
        ) : (
          <span className="tx5">—</span>
        ),
    },
    ...(canViewAmounts
      ? [
          {
            key: 'cost',
            header: 'اثر هزینه',
            minWidth: 110,
            render: (risk: RiskListItemDto) => <span className="t-12 tx7">{risk.costImpact ? formatRial(risk.costImpact) : '—'}</span>,
          },
        ]
      : []),
  ];

  const categoryOptions: Array<SelectOption<string>> = [{ value: 'all', label: 'همهٔ دسته‌ها' }, ...(data?.categories ?? []).map((entry) => ({ value: entry, label: entry }))];
  const projectOptions: Array<SelectOption<string>> = useMemo(() => {
    const seen = new Map<string, string>();
    (data?.items ?? []).forEach((risk) => seen.set(risk.projectId, risk.projectName));
    return [{ value: 'all', label: 'همهٔ پروژه‌ها' }, ...[...seen].map(([value, label]) => ({ value, label }))];
  }, [data]);

  const summary = data?.summary;
  const maxCategory = Math.max(1, ...(data?.byCategory ?? []).map((entry) => entry.count));

  return (
    <>
      <PageHead
        title={project ? 'دفتر ریسک' : 'ریسک‌های همهٔ پروژه‌ها'}
        subtitle={
          summary
            ? `${toFaDigits(summary.open)} ریسک باز${summary.openFromFieldThisMonth > 0 ? ` · ${toFaDigits(summary.openFromFieldThisMonth)} مورد این ماه از گزارش کارگاه` : ''}`
            : undefined
        }
        actions={
          <>
            <AppButton
              variant="outline"
              icon="download"
              disabled={!data}
              onClick={() => {
                exportRisks(project ? `risks-${project.code}` : 'risks-all', rows, project === null);
                toast.success('خروجی دفتر ریسک آماده شد.');
              }}
            >
              خروجی Excel
            </AppButton>
            {canCreate && (
              <AppButton variant="primary" icon="plus" onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('new', '1'); return next; })}>
                ثبت ریسک
              </AppButton>
            )}
          </>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={8} />
      ) : query.isError || !data || !summary ? (
        <EmptyState
          inCard
          icon="server"
          title="دفتر ریسک بارگذاری نشد"
          description="چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
              تلاش دوباره
            </AppButton>
          }
        />
      ) : (
        <>
          <div className="grid c5 rsp" style={{ gap: 12, marginBottom: 16 }}>
            <KpiCard label="ریسک‌های باز" icon="shield-alert" tone="pri" value={toFaDigits(summary.open)} hint={summary.unassessedOpen > 0 ? `${toFaDigits(summary.unassessedOpen)} ارزیابی‌نشده` : 'همه ارزیابی شده‌اند'} />
            <KpiCard label="بالا و بحرانی" icon="alert-triangle" tone="err" value={toFaDigits(summary.highOrCritical)} valueClassName={summary.highOrCritical > 0 ? 'tx-err' : undefined} hint="امتیاز ۱۵ و بیشتر" />
            <KpiCard label="اقدام معوق" icon="clock" tone="wrn" value={toFaDigits(summary.overdueActions)} valueClassName={summary.overdueActions > 0 ? 'tx-wrn' : undefined} hint="موعد گذشته و انجام‌نشده" />
            {summary.costImpact !== null && <KpiCard label="اثر مالی بالقوه" icon="receipt" tone="acc" value={formatRial(summary.costImpact)} hint="جمع ریسک‌های باز" />}
            <KpiCard
              label="اثر زمانی بالقوه"
              icon="calendar"
              tone="inf"
              value={`${toFaDigits(summary.scheduleImpactDays)} روز`}
              hint={summary.scheduleImpactBasis === 'critical_path_sum' ? 'جمع روی مسیر بحرانی' : 'بیشترین اثر یک ریسک'}
            />
          </div>

          <div className="risk-top-grid">
            <Card>
              <CardHeader
                icon="layout-grid"
                title="ماتریس احتمال × اثر"
                subtitle="فقط ریسک‌های باز ارزیابی‌شده؛ روی خانه بزنید تا فهرست فیلتر شود"
                action={cell && <Chip selected onRemove={() => setCell(null)}>{`${toFaDigits(cell.probability)} × ${toFaDigits(cell.impact)}`}</Chip>}
              />
              <CardBody className="col g12">
                <RiskMatrix counts={data.matrix} selected={cell} onSelect={(next) => { setCell(next); if (next) setStatus('open'); }} />
                <RiskLegend />
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon="layers" title="ریسک‌های باز بر اساس دسته" />
              <CardBody className="col g10">
                {data.byCategory.length === 0 ? (
                  <span className="t-13 tx5">ریسک بازی نیست.</span>
                ) : (
                  data.byCategory.map((entry) => (
                    <button
                      key={entry.category}
                      type="button"
                      className="row g10"
                      style={{ textAlign: 'start', background: category === entry.category ? '#F4F4F5' : undefined, borderRadius: 6, padding: '2px 4px' }}
                      onClick={() => setCategory(category === entry.category ? 'all' : entry.category)}
                      aria-pressed={category === entry.category}
                    >
                      <span className="t-13 tx7" style={{ width: 72 }}>{entry.category}</span>
                      <span className="grow" style={{ height: 8, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${(entry.count / maxCategory) * 100}%`, background: categoryColor(entry.category), borderRadius: 4 }} />
                      </span>
                      <span className="t-13 fw6 tx9" style={{ width: 20, textAlign: 'end' }}>{toFaDigits(entry.count)}</span>
                    </button>
                  ))
                )}
                {data.overdueActionTitles.length > 0 && (
                  <Alert tone="wrn" icon="clock">
                    <span className="fw6">{`${toFaDigits(data.overdueActionTitles.length)} اقدام معوق: `}</span>
                    {data.overdueActionTitles.slice(0, 3).join('، ')}
                    {data.overdueActionTitles.length > 3 ? ` و ${toFaDigits(data.overdueActionTitles.length - 3)} مورد دیگر` : ''}
                  </Alert>
                )}
              </CardBody>
            </Card>
          </div>

          {wbsItem && (
            <div style={{ marginBottom: 12 }}>
              <Alert tone="inf" icon="filter" action={<button type="button" className="link" onClick={() => clearParam('wbsItem')}>نمایش همه</button>}>
                فقط ریسک‌های پیوندخورده به فعالیت انتخاب‌شده از WBS.
              </Alert>
            </div>
          )}

          <Card>
            <CardHeader
              title={
                <span className="row g6">
                  فهرست ریسک‌ها
                  <Badge size="sm" tone="neu">{toFaDigits(rows.length)}</Badge>
                </span>
              }
              action={
                <span className="row wrap g8">
                  <span className="row g4" role="group" aria-label="فیلتر وضعیت">
                    {STATUS_FILTERS.map(([key, label]) => (
                      <Chip key={key} selected={status === key} onClick={() => setStatus(key)}>
                        {label}
                      </Chip>
                    ))}
                  </span>
                  <TextInput size="sm" icon="search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی شناسه، عنوان یا مالک…" aria-label="جستجوی ریسک" style={{ width: 220 }} />
                  <Select size="sm" label="فیلتر دسته" options={categoryOptions} value={category} onChange={setCategory} width={130} />
                  {project === null && <Select size="sm" label="فیلتر پروژه" options={projectOptions} value={projectFilter} onChange={setProjectFilter} width={170} />}
                </span>
              }
            />
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(risk) => risk.id}
              minWidth={project === null ? 1240 : 1100}
              caption="دفتر ریسک"
              onRowClick={(risk) => navigate(detailPath(risk))}
              empty={
                data.items.length === 0 ? (
                  <EmptyState
                    icon="shield"
                    title="هنوز ریسکی ثبت نشده"
                    description="ریسک‌ها را از همین‌جا یا از گزارش روزانهٔ کارگاه ثبت کنید."
                    actions={canCreate && <AppButton size="sm" variant="primary" icon="plus" onClick={() => setParams({ new: '1' })}>ثبت اولین ریسک</AppButton>}
                  />
                ) : (
                  <span className="t-13 tx6">ریسکی با این فیلتر نیست.</span>
                )
              }
            />
          </Card>
        </>
      )}

      {creating && project && data && (
        <RiskFormDialog
          projectId={project.id}
          projectName={project.name}
          categories={data.categories}
          nextCode={data.nextCode}
          initialWbsItemId={wbsItem}
          onClose={() => clearParam('new')}
          onSaved={(riskId) => navigate(ROUTES.riskDetail(project.id, riskId))}
        />
      )}
    </>
  );
}
