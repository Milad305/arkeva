import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Chip } from '@/shared/components/ui/Chip';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { Modal } from '@/shared/components/ui/Modal';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Lightbox } from '@/shared/components/ui/PhotoThumb';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Tabs } from '@/shared/components/ui/Tabs';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatRelativeTime, formatTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import { appLink } from '@/shared/utils/appUrl';
import type { EntityId } from '@/shared/types/api';
import { useApproveCleanMutation, useGetFieldReportQuery, useGetInboxQuery } from '../api/fieldReportsApi';
import { useItemDecisions } from '../hooks/useItemDecisions';
import { exportInbox } from '../services/reportsExport';
import { INBOX_TABS, reportTitle, toPhotos } from '../services/reportView';
import type { FieldItemDto, FieldReportDto, FieldReportSummaryDto, InboxQuery, InboxTab } from '../types';
import { DecisionDialog } from './DecisionDialog';
import { FieldItemCard } from './FieldItemCard';
import { ManualEntryDialog } from './ItemActionDialogs';
import { QuickApproveDialog } from './QuickApproveDialog';
import { ReportLocationDialog } from './ReportLocationDialog';

const TAB_KEYS = INBOX_TABS.map((tab) => tab.key);
const TAB_OF_STATUS: Record<string, InboxTab> = { stage1: 'pending', stage2: 'pending', needs_resolution: 'pending', approved: 'approved', needs_revision: 'needs_revision', rejected: 'rejected' };

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable));
};

export interface FieldReportsViewProps {
  /** پروژهٔ جاری؛ `null` = صندوق میان‌پروژه‌ای (approval-workflow.md ۵.۱). */
  project: { id: EntityId; name: string; status: string } | null;
}

/**
 * W20 — صندوق گزارش‌های کارگاه: KPI، زبانه‌ها (هر گزارش در هر زبانه‌ای که آیتمی از آن دارد —
 * تصمیم 1405/08/15)، فیلترها، فهرست گزارش‌ها و جزئیات با آیتم‌ها. میانبرها: J/K، A، E، R،
 * Shift+A، ?.
 */
export function FieldReportsView({ project }: FieldReportsViewProps) {
  const [params, setParams] = useSearchParams();
  const canManual = useHasPermission('report.manual_entry');
  const tabParam = params.get('tab') as InboxTab | null;
  const tab: InboxTab = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'pending';
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [supervisor, setSupervisor] = useState<string>('all');
  const [wbsRoot, setWbsRoot] = useState<string>('all');
  const [range, setRange] = useState<InboxQuery['range']>('7d');
  const [flagged, setFlagged] = useState(false);
  const [sort, setSort] = useState<InboxQuery['sort']>('newest');
  const [help, setHelp] = useState(false);
  const [quick, setQuick] = useState<{ reportId: EntityId; itemId: EntityId | null; projectId: EntityId } | null>(null);
  const wbsItem = params.get('wbsItem');
  const projectId = project?.id ?? (projectFilter === 'all' ? null : projectFilter);

  const query = useGetInboxQuery({
    projectId,
    tab,
    supervisorId: supervisor === 'all' ? null : supervisor,
    wbsRootId: project && wbsRoot !== 'all' ? wbsRoot : null,
    wbsItemId: wbsItem,
    range: wbsItem ? 'all' : range,
    flagged,
    sort,
  });
  const data = query.data;
  const list = data?.reports ?? [];
  const selectedId = params.get('report') && list.some((report) => report.id === params.get('report')) ? params.get('report') : (list[0]?.id ?? null);
  const selected = list.find((report) => report.id === selectedId) ?? null;

  const setParam = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const move = (step: number) => {
    if (list.length === 0) return;
    const position = Math.max(0, list.findIndex((report) => report.id === selectedId));
    const next = list[Math.min(list.length - 1, Math.max(0, position + step))];
    if (next) setParam('report', next.id);
  };

  // J/K و ? در سطح صفحه؛ A/E/R/Shift+A در جزئیات
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || document.querySelector('.backdrop')) return;
      if (event.key === 'j' || event.key === 'J') move(1);
      else if (event.key === 'k' || event.key === 'K') move(-1);
      else if (event.key === '?') setHelp(true);
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // W40 از W05/W11 با `?item=&report=`
  useEffect(() => {
    const item = params.get('item');
    const report = params.get('quick');
    if (item && report && project) {
      setQuick({ reportId: report, itemId: item, projectId: project.id });
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('item');
          next.delete('quick');
          return next;
        },
        { replace: true },
      );
    }
  }, [params, project, setParams]);

  const kpis = data?.kpis;
  const filterOptions = useMemo(() => {
    const projects: Array<SelectOption<string>> = [{ value: 'all', label: 'همهٔ پروژه‌ها' }, ...(data?.filters.projects ?? []).map((entry) => ({ value: entry.id, label: entry.name }))];
    const supervisors: Array<SelectOption<string>> = [{ value: 'all', label: 'همهٔ سرپرستان' }, ...(data?.filters.supervisors ?? []).map((entry) => ({ value: entry.id, label: entry.fullName }))];
    const roots: Array<SelectOption<string>> = [{ value: 'all', label: 'همهٔ فعالیت‌های WBS' }, ...(data?.filters.wbsRoots ?? []).map((entry) => ({ value: entry.id, label: `${entry.code} · ${entry.title}` }))];
    return { projects, supervisors, roots };
  }, [data]);

  return (
    <>
      <PageHead
        title="گزارش‌های کارگاه"
        subtitle={
          kpis ? (
            <>
              {toFaDigits(kpis.pendingReports)} گزارش در انتظار{project ? '' : ` از ${toFaDigits(kpis.pendingProjects)} پروژه`}، شامل <strong className="tx9">{toFaDigits(kpis.pendingItems)} آیتم پیشرفت</strong>
            </>
          ) : undefined
        }
        actions={
          <>
            <AppButton
              variant="outline"
              size="sm"
              icon="file-spreadsheet"
              disabled={list.length === 0}
              onClick={() => {
                exportInbox(project ? `field-reports-${project.id}` : 'field-reports', list, tab);
                toast.success('خروجی گزارش‌ها آماده شد.');
              }}
            >
              خروجی Excel
            </AppButton>
            <AppButton variant="outline" size="sm" icon="keyboard" onClick={() => setHelp(true)}>
              میانبرها
              <Kbd>?</Kbd>
            </AppButton>
          </>
        }
      />

      <div className="grid c4 rsp" style={{ gap: 12, marginBottom: 14 }}>
        <KpiCard layout="inline" icon="layers" tone="inf" valueClassName="tx-inf" value={kpis ? toFaDigits(kpis.pendingItems) : '—'} label={`آیتم در انتظار · در ${toFaDigits(kpis?.pendingReports ?? 0)} گزارش`} />
        <KpiCard layout="inline" icon="alert-octagon" tone="err" valueClassName="tx-err" value={kpis ? toFaDigits(kpis.overdueItems) : '—'} label="آیتم از مهلت بررسی گذشته" />
        <KpiCard layout="inline" icon="check-circle-2" tone="ok" valueClassName="tx-ok" value={kpis ? toFaDigits(kpis.approvedByMeToday) : '—'} label="تأییدشده توسط شما امروز" />
        <KpiCard layout="inline" icon="rotate-ccw" tone="wrn" valueClassName="tx-wrn" value={kpis ? toFaDigits(kpis.returnedItems) : '—'} label={`رد یا نیاز اصلاح · در ${toFaDigits(kpis?.returnedReports ?? 0)} گزارش`} />
      </div>

      <Tabs
        items={INBOX_TABS.map((entry) => ({ key: entry.key, label: entry.label, count: data?.tabCounts[entry.key], countTone: entry.tone }))}
        activeKey={tab}
        onChange={(key) => setParam('tab', key === 'pending' ? null : key)}
        style={{ padding: 0, borderBottom: '1px solid #E4E4E7', marginBottom: 12 }}
      />

      <div className="row wrap g8" style={{ marginBottom: 12 }}>
        {!project && <Select size="sm" label="فیلتر پروژه" options={filterOptions.projects} value={projectFilter} onChange={setProjectFilter} width={170} />}
        <Select size="sm" label="فیلتر سرپرست" options={filterOptions.supervisors} value={supervisor} onChange={setSupervisor} width={160} />
        {project && <Select size="sm" label="زیردرخت WBS" options={filterOptions.roots} value={wbsRoot} onChange={setWbsRoot} width={200} />}
        <Select
          size="sm"
          label="بازهٔ زمانی"
          options={[
            { value: '7d', label: '۷ روز اخیر' },
            { value: '30d', label: '۳۰ روز اخیر' },
            { value: 'all', label: 'همهٔ زمان‌ها' },
          ]}
          value={range}
          onChange={(value) => setRange(value as InboxQuery['range'])}
          width={130}
        />
        <Chip icon="alert-triangle" selected={flagged} onClick={() => setFlagged((value) => !value)}>
          {`فقط مشکوک (${toFaDigits(data?.flaggedCount ?? 0)})`}
        </Chip>
        {wbsItem && (
          <Chip selected onRemove={() => setParam('wbsItem', null)}>
            فقط یک فعالیت WBS
          </Chip>
        )}
        <span className="ms-auto">
          <Select
            size="sm"
            label="مرتب‌سازی"
            options={[
              { value: 'newest', label: 'جدیدترین دریافت' },
              { value: 'oldest_waiting', label: 'قدیمی‌ترین انتظار' },
            ]}
            value={sort}
            onChange={(value) => setSort(value as InboxQuery['sort'])}
            width={160}
          />
        </span>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={8} />
      ) : query.isError || !data ? (
        <EmptyState
          inCard
          icon="server"
          title="گزارش‌ها بارگذاری نشد"
          description="چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
              تلاش دوباره
            </AppButton>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          inCard
          icon={tab === 'pending' ? 'check-circle-2' : 'clipboard-check'}
          iconStyle={tab === 'pending' ? { background: '#DCFCE7', color: '#15803D' } : undefined}
          title={tab === 'pending' && !flagged ? 'صف تأیید خالی است' : 'گزارشی با این فیلتر نیست'}
          description={tab === 'pending' && !flagged ? 'گزارش تازه‌ای که به حوزهٔ شما برسد اینجا دیده می‌شود.' : 'فیلترها یا بازهٔ زمانی را تغییر دهید.'}
        />
      ) : (
        <div className="card fr-split">
          <section className="fr-list" aria-label="فهرست گزارش‌ها">
            <div className="row g8" style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E7', background: '#FAFAFA' }}>
              <span className="t-13 tx6">{toFaDigits(list.length)} گزارش</span>
              <span className="t-sm tx5 ms-auto">{sort === 'newest' ? 'مرتب‌شده بر اساس زمان دریافت' : 'قدیمی‌ترین انتظار اول'}</span>
            </div>
            <div className="col fr-scroll">
              {list.map((report) => (
                <ReportRow key={report.id} report={report} tab={tab} selected={report.id === selectedId} showProject={!project} onSelect={() => setParam('report', report.id)} />
              ))}
            </div>
            <div className="row between t-sm tx6" style={{ padding: '8px 14px', borderTop: '1px solid #E4E4E7', background: '#FAFAFA' }}>
              <span>
                <strong className="tx9">{toFaDigits(list.length)}</strong> گزارش
              </span>
              <span className="row g4">
                <Kbd>J</Kbd>
                <Kbd>K</Kbd>
                حرکت بین گزارش‌ها
              </span>
            </div>
          </section>
          <section className="fr-detail" aria-label="جزئیات گزارش">
            {selected ? (
              <ReportDetail
                key={selected.id}
                summary={selected}
                tab={tab}
                onQuick={(item) => setQuick({ reportId: selected.id, itemId: item.id, projectId: selected.projectId })}
                onAfterAll={() => move(1)}
              />
            ) : (
              <EmptyState icon="clipboard-check" title="گزارشی انتخاب نشده" description="از فهرست یک گزارش را باز کنید." />
            )}
          </section>
        </div>
      )}

      {help && <ShortcutsDialog onClose={() => setHelp(false)} />}
      {quick && <QuickApproveDialog projectId={quick.projectId} reportId={quick.reportId} itemId={quick.itemId} onClose={() => setQuick(null)} />}
      {project && params.get('manual') === '1' && wbsItem && canManual && (
        <ManualEntryDialog
          projectId={project.id}
          wbsItemId={wbsItem}
          onClose={() => setParam('manual', null)}
          onCreated={(reportId) => {
            setParams({ tab: 'all', report: reportId, wbsItem }, { replace: true });
          }}
        />
      )}
    </>
  );
}

function ReportRow({ report, tab, selected, showProject, onSelect }: { report: FieldReportSummaryDto; tab: InboxTab; selected: boolean; showProject: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  const count = tab === 'all' ? report.itemCount : report.counts[tab];
  const countLabel = tab === 'pending' ? 'در انتظار' : tab === 'approved' ? 'تأییدشده' : tab === 'needs_revision' ? 'نیاز اصلاح' : tab === 'rejected' ? 'رد شده' : 'آیتم';
  return (
    <button
      ref={ref}
      type="button"
      className={cn('row g10 ai-st', selected && 'sel-card')}
      style={{ padding: '12px 14px', borderBottom: '1px solid #F4F4F5', textAlign: 'start', width: '100%', background: selected ? '#F1F4F8' : undefined }}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <Avatar name={report.author.fullName} tone={report.author.avatarTone ?? 'a1'} size="m" />
      <span className="col g4 grow" style={{ minWidth: 0 }}>
        <span className="row between g8">
          <span className="t-13 fw6 tx9 trunc">{report.source === 'web_manual' ? `ثبت دستی · ${report.author.fullName}` : report.author.fullName}</span>
          <span className="t-sm tx5 nowrap">{formatRelativeTime(report.serverReceivedAt)}</span>
        </span>
        <span className="t-12 tx6 trunc">
          {showProject ? `${report.projectName} · ` : ''}
          <span className="mono">{report.reportNo}</span> · {toFaDigits(report.itemCount)} آیتم پیشرفت
        </span>
        <span className="row wrap g4">
          <Badge size="sm" tone={tab === 'pending' ? 'inf' : tab === 'approved' ? 'ok' : tab === 'needs_revision' ? 'wrn' : tab === 'rejected' ? 'err' : 'neu'}>
            {`${toFaDigits(count)} ${countLabel}`}
          </Badge>
          {report.flagLabel && (
            <Badge size="sm" tone="wrn" icon="alert-triangle">
              {report.flagLabel}
            </Badge>
          )}
          <Badge size="sm" tone="neu" icon="camera">
            {`${toFaDigits(report.photoCount)} عکس`}
          </Badge>
          {report.offline && (
            <Badge size="sm" tone="neu" icon="cloud-off">
              ثبت آفلاین
            </Badge>
          )}
        </span>
      </span>
    </button>
  );
}

function ReportDetail({ summary, tab, onQuick, onAfterAll }: { summary: FieldReportSummaryDto; tab: InboxTab; onQuick: (item: FieldItemDto) => void; onAfterAll: () => void }) {
  const query = useGetFieldReportQuery({ projectId: summary.projectId, reportId: summary.id });
  const report = query.data;
  const [activeId, setActiveId] = useState<EntityId | null>(null);
  const [approveClean, cleanState] = useApproveCleanMutation();
  const [reportRevision, setReportRevision] = useState(false);
  const decisions = useItemDecisions(summary.projectId, (item) => {
    const items = report?.items ?? [];
    const next = items.find((entry, position) => position > items.findIndex((candidate) => candidate.id === item.id) && entry.can.decide);
    setActiveId(next?.id ?? null);
  });

  const items = useMemo(() => {
    if (!report) return [];
    // آیتم‌های زبانهٔ جاری اول (تصمیم 1405/08/15)
    return [...report.items].sort((a, b) => Number(TAB_OF_STATUS[b.status] === tab) - Number(TAB_OF_STATUS[a.status] === tab));
  }, [report, tab]);
  const active = items.find((item) => item.id === activeId) ?? items.find((item) => item.can.decide) ?? null;
  const clean = items.filter((item) => item.can.decide && item.flags.every((flag) => flag === 'photos_pending') && !(item.status === 'stage1' && item.requiresStage2));
  const pendingCount = items.filter((item) => item.can.decide).length;

  async function runApproveClean() {
    if (!report || clean.length === 0) return;
    try {
      const result = await approveClean({ projectId: report.projectId, reportId: report.id }).unwrap();
      toast.success(
        `${toFaDigits(result.approved)} آیتم تأیید شد${result.movedToStage2 ? `؛ ${toFaDigits(result.movedToStage2)} آیتم به مرحلهٔ دوم رفت` : ''}${result.skipped ? `؛ ${toFaDigits(result.skipped)} آیتم پرچم‌دار ماند` : ''}.`,
      );
      if (result.skipped === 0) onAfterAll();
    } catch {
      // پیام را میان‌افزار نشان می‌دهد
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || document.querySelector('.backdrop') || !active) return;
      const key = event.key.toLowerCase();
      if (key === 'a' && event.shiftKey) void runApproveClean();
      else if (!active.can.decide) return;
      else if (key === 'a') decisions.approve(active);
      else if (key === 'e') decisions.open('request_revision', active);
      else if (key === 'r') decisions.open('reject', active);
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (query.isLoading || !report) return <div style={{ padding: 18 }}>{query.isError ? <span className="t-13 tx6">این گزارش بارگذاری نشد.</span> : <SkeletonTable rows={4} />}</div>;

  return (
    <>
      <ReportHeader report={report} pendingCount={pendingCount} />
      <div className="col g12" style={{ padding: '12px 18px', flex: '1 1 auto' }}>
        {items.map((item) => (
          <FieldItemCard
            key={item.id}
            item={item}
            active={active?.id === item.id}
            busy={decisions.busyId === item.id}
            onActivate={() => setActiveId(item.id)}
            onOpenQuick={() => onQuick(item)}
            onApprove={() => decisions.approve(item)}
            onDialog={(kind) => decisions.open(kind, item)}
          />
        ))}
      </div>
      {pendingCount > 0 && (
        <div className="row wrap g8 fr-actions">
          <AppButton variant="success" icon="check-check" disabled={clean.length === 0} loading={cleanState.isLoading} onClick={() => void runApproveClean()}>
            {`تأیید همه (${toFaDigits(clean.length)} آیتم بی‌پرچم)`}
            <Kbd onDark>Shift+A</Kbd>
          </AppButton>
          <AppButton variant="outline" onClick={() => setReportRevision(true)}>
            درخواست اصلاح گزارش
          </AppButton>
          <span className="t-sm tx5 ms-auto">بعد از تأیید، پیشرفت WBS و S-Curve به‌روز می‌شود</span>
        </div>
      )}
      {decisions.element}
      {reportRevision && (
        <DecisionDialog
          projectId={report.projectId}
          mode="report_revision"
          report={{ id: report.id, pendingCount, reportNo: report.reportNo }}
          onClose={() => setReportRevision(false)}
          onDone={(message) => {
            setReportRevision(false);
            if (message) toast.success(message);
          }}
        />
      )}
    </>
  );
}

function ReportHeader({ report, pendingCount }: { report: FieldReportDto; pendingCount: number }) {
  const gpsOut = report.distanceFromSiteM != null && report.distanceFromSiteM > report.siteRadiusM;
  const delay = report.delayMinutes >= 60 ? `${toFaDigits(Math.round(report.delayMinutes / 60))} ساعت تأخیر` : `${toFaDigits(report.delayMinutes)} دقیقه تأخیر`;
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [showLocation, setShowLocation] = useState(false);

  // همهٔ عکس‌های گزارش پشت‌سرهم؛ در کارت هر آیتم فقط عکس‌های همان آیتم دیده می‌شود
  const photos = useMemo(() => toPhotos(report.items.flatMap((item) => item.photos)), [report.items]);

  const reportLink = appLink(`/projects/${report.projectId}/reports?report=${report.id}`);
  const copyLink = () => {
    void navigator.clipboard?.writeText(reportLink);
    toast.success('پیوند گزارش کپی شد.');
  };

  /**
   * منوی گزارش (بوم W45) — فقط مکمل دکمه‌ها: تأیید، اصلاح و رد دکمهٔ خودشان را
   * دارند و در منو تکرار نمی‌شوند.
   */
  const menu: MenuEntry[] = [
    { key: 'pdf', label: 'دانلود PDF', icon: 'printer', note: 'در پنجرهٔ چاپ «ذخیره به PDF» را بزنید', onSelect: () => window.print() },
    { key: 'link', label: 'کپی پیوند گزارش', icon: 'link-2', onSelect: copyLink },
    { key: 'sep', separator: true },
    {
      key: 'photos',
      label: `مشاهدهٔ عکس‌ها (${toFaDigits(photos.length)})`,
      icon: 'image',
      disabled: photos.length === 0,
      disabledReason: 'این گزارش عکسی ندارد.',
      onSelect: () => setPhotoIndex(0),
    },
    {
      key: 'map',
      label: 'مشاهده روی نقشه',
      icon: 'map-pin',
      disabled: report.gpsLat == null,
      disabledReason: report.source === 'web_manual' ? 'ثبت دستی وب مهر مکان ندارد.' : 'موقعیت کارگاه این پروژه تنظیم نشده است.',
      onSelect: () => setShowLocation(true),
    },
  ];

  return (
    <div className="col g8" style={{ padding: '14px 18px', borderBottom: '1px solid #F4F4F5' }}>
      <nav className="row g4 t-sm tx5" aria-label="مسیر">
        <span>{report.projectName}</span>
        <Icon name="chevron-left" size={11} />
        <span>{report.source === 'web_manual' ? 'ثبت دستی وب' : 'گزارش روزانه'}</span>
      </nav>
      <div className="row between g8">
        <h2 className="h-t3" style={{ margin: 0 }}>
          {reportTitle(report.author.fullName, report.workDate, report.source === 'web_manual')}
        </h2>
        <span className="row g2">
          <IconButton icon="printer" label="چاپ" size="sm" onClick={() => window.print()} />
          <IconButton icon="link-2" label="کپی پیوند" size="sm" onClick={copyLink} />
          <Menu
            align="start"
            entries={menu}
            trigger={(props) => <IconButton {...props} icon="more-vertical" label="گزینه‌های گزارش" size="sm" />}
          />
        </span>
      </div>
      <div className="row wrap g6">
        <Badge tone="neu" className="mono">
          {report.reportNo}
        </Badge>
        {pendingCount > 0 && <Badge tone="inf">{`${toFaDigits(pendingCount)} از ${toFaDigits(report.itemCount)} آیتم در انتظار`}</Badge>}
        {report.distanceFromSiteM != null && (
          <Badge tone={gpsOut ? 'err' : 'ok'} icon="map-pin">
            {gpsOut ? 'بیرون از محدودهٔ کارگاه' : 'داخل محدودهٔ پروژه'}
          </Badge>
        )}
        {report.offline && (
          <Badge tone="neu" icon="cloud-off">
            ثبت آفلاین
          </Badge>
        )}
        {report.attested && (
          <Badge tone="neu" icon="check">
            تعهد سرپرست به صحت
          </Badge>
        )}
      </div>
      <div className="box grid c4 rsp" style={{ gap: 10, background: '#FFFFFF' }}>
        <div className="kv">
          <span className="k">ثبت در گوشی</span>
          <span className="v row g4 t-12">
            <Icon name={report.source === 'web_manual' ? 'monitor' : 'smartphone'} size={12} />
            {formatTime(report.deviceRecordedAt)}
          </span>
        </div>
        <div className="kv">
          <span className="k">دریافت در سرور</span>
          <span className="v row g4 t-12">
            <Icon name="server" size={12} />
            {formatTime(report.serverReceivedAt)} · {delay}
          </span>
        </div>
        <div className="kv">
          <span className="k">هوا و نیرو</span>
          <span className="v row g4 t-12">
            <Icon name="cloud-sun" size={12} />
            {report.weather ? `${report.weather}${report.temperatureC != null ? ` ${toFaDigits(report.temperatureC)}°` : ''}` : '—'}
            {report.crewCount ? ` · ${toFaDigits(report.crewCount)} نفر` : ''}
          </span>
        </div>
        <div className="kv">
          <span className="k">فاصلهٔ GPS</span>
          <span className={`v row g4 t-12 ${gpsOut ? 'tx-err' : ''}`}>
            <Icon name="locate-fixed" size={12} />
            {report.distanceFromSiteM != null ? `${toFaDigits(report.distanceFromSiteM)} متر از مرکز` : '—'}
          </span>
        </div>
      </div>
      {report.note && <span className="t-12 tx7 lh">{report.note}</span>}
      <Lightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onNavigate={setPhotoIndex} />
      {showLocation && <ReportLocationDialog report={report} onClose={() => setShowLocation(false)} />}
    </div>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows: Array<[string[], string]> = [
    [['J'], 'گزارش بعدی'],
    [['K'], 'گزارش قبلی'],
    [['A'], 'تأیید آیتم فعال'],
    [['E'], 'درخواست اصلاح آیتم فعال'],
    [['R'], 'رد آیتم فعال'],
    [['Shift+A'], 'تأیید همهٔ آیتم‌های بی‌پرچم گزارش'],
    [['?'], 'همین راهنما'],
  ];
  return (
    <Modal isOpen onClose={onClose} size="sm" title="میانبرهای صفحه‌کلید">
      <div className="col g8">
        {rows.map(([keys, label]) => (
          <span key={label} className="row between t-13">
            <span className="tx7">{label}</span>
            <span className="row g4">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </span>
        ))}
        <span className="t-12 tx5">آیتم فعال با کلیک روی کارتش عوض می‌شود. در W40 کلید A تأیید و فلش‌ها حرکت بین آیتم‌هاست.</span>
      </div>
    </Modal>
  );
}
