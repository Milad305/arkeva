import { useMemo, useState } from 'react';

import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { PageHead } from '@/shared/components/ui/PageHead';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import {
  useCreateCustomTemplateMutation,
  useDeleteGeneratedReportMutation,
  useDeleteScheduleMutation,
  useGenerateReportMutation,
  useGetGeneratedReportsQuery,
  useGetReportOptionsQuery,
  useGetReportTemplatesQuery,
  useGetSchedulesQuery,
  useRunScheduleNowMutation,
  useSaveScheduleMutation,
  useSendReportMutation,
  useToggleScheduleMutation,
} from '../api/managementReportsApi';
import { CustomTemplateDialog, ScheduleDialog, SendDialog } from '../components/ReportDialogs';
import { ReportPreviewPanel } from '../components/ReportPreviewPanel';
import type {
  CustomTemplateInput,
  GeneratedReportDto,
  RecipientKind,
  ReportCategory,
  ReportScheduleDto,
  ReportSectionKey,
  ScheduleInput,
} from '../types';

type Dialog =
  | { kind: 'schedule'; schedule: ReportScheduleDto | null }
  | { kind: 'custom' }
  | { kind: 'send'; rangeId: string; disabled: ReportSectionKey[] }
  | { kind: 'delete_schedule'; schedule: ReportScheduleDto }
  | { kind: 'delete_output'; report: GeneratedReportDto }
  | null;

const STATUS_TONE: Record<GeneratedReportDto['status'], { label: string; tone: 'ok' | 'wrn' | 'err' | 'neu' }> = {
  queued: { label: 'در صف', tone: 'neu' },
  running: { label: 'در حال تولید', tone: 'wrn' },
  done: { label: 'آماده', tone: 'ok' },
  failed: { label: 'ناموفق', tone: 'err' },
};

/**
 * W25 — گزارش‌های مدیریتی (F18 ۹): کتابخانهٔ قالب‌ها با فیلتر دسته، زمان‌بندی‌ها و
 * خروجی‌های اخیر، و پیش‌نمایش زندهٔ صفحهٔ گزارش با دانلود، ارسال و زمان‌بندی.
 *
 * تولید فایل کار سرور است (۷.۲)؛ تا آمدن بک‌اند «دانلود PDF» همین صفحهٔ پیش‌نمایش را
 * با چاپ مرورگر می‌دهد و یک `GeneratedReport` ثبت می‌کند (تصمیم 1405/08/20).
 */
export default function ManagementReportsPage() {
  const canView = useHasPermission('reports.view');
  const canGenerate = useHasPermission('reports.generate');
  const canSchedule = useHasPermission('reports.schedule');
  const canCustom = useHasPermission('reports.custom_template');
  const canSendExternal = useHasPermission('reports.send_external');
  const canViewAmounts = useHasPermission('cbs.view_amounts');

  const library = useGetReportTemplatesQuery();
  const options = useGetReportOptionsQuery();
  const schedules = useGetSchedulesQuery();
  const outputs = useGetGeneratedReportsQuery();

  const [category, setCategory] = useState<ReportCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tab, setTab] = useState<'schedules' | 'outputs'>('schedules');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [saveSchedule, saveState] = useSaveScheduleMutation();
  const [toggleSchedule] = useToggleScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();
  const [runNow] = useRunScheduleNowMutation();
  const [createCustom, createState] = useCreateCustomTemplateMutation();
  const [generate, generateState] = useGenerateReportMutation();
  const [sendReport, sendState] = useSendReportMutation();
  const [deleteOutput] = useDeleteGeneratedReportMutation();

  const items = useMemo(() => library.data?.items ?? [], [library.data]);
  const normalize = (value: string) => value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const visible = useMemo(() => {
    const query = normalize(search);
    return items
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => query === '' || normalize(item.name).includes(query) || normalize(item.description).includes(query));
  }, [items, category, search]);

  const template = useMemo(
    () => visible.find((item) => item.id === selectedId) ?? visible[0] ?? items[0] ?? null,
    [visible, selectedId, items],
  );

  const activeProjectId = projectId ?? options.data?.projects[0]?.id ?? null;

  async function onDownload(rangeId: string, disabled: ReportSectionKey[]) {
    if (!template) return;
    try {
      await generate({
        templateId: template.id,
        projectId: template.scope === 'portfolio' ? null : activeProjectId,
        rangeId,
        disabledSections: disabled,
        canViewAmounts,
        format: 'pdf',
      }).unwrap();
      // تا آمدن بک‌اند، فایل از چاپ مرورگر همین صفحهٔ پیش‌نمایش ساخته می‌شود.
      document.body.dataset.print = 'report';
      window.print();
      delete document.body.dataset.print;
      toast.success('گزارش ساخته شد و در «خروجی‌های اخیر» ثبت شد.');
      setTab('outputs');
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function onSend(recipients: Array<{ kind: RecipientKind; id: string }>) {
    if (!template || dialog?.kind !== 'send') return;
    setDialogError(null);
    try {
      const result = await sendReport({
        templateId: template.id,
        projectId: template.scope === 'portfolio' ? null : activeProjectId,
        rangeId: dialog.rangeId,
        recipients,
        canSendExternal,
      }).unwrap();
      toast.success(result.message);
      setDialog(null);
      setTab('outputs');
    } catch (cause) {
      setDialogError(getApiErrorMessage(cause));
    }
  }

  async function onSaveSchedule(input: ScheduleInput) {
    setDialogError(null);
    try {
      await saveSchedule({ ...input, canSendExternal }).unwrap();
      toast.success(input.id ? 'زمان‌بندی به‌روز شد.' : 'زمان‌بندی ساخته شد؛ اولین اجرا طبق نوبت انجام می‌شود.');
      setDialog(null);
    } catch (cause) {
      setDialogError(getApiErrorMessage(cause));
    }
  }

  async function onCreateCustom(input: CustomTemplateInput) {
    setDialogError(null);
    try {
      const created = await createCustom(input).unwrap();
      setSelectedId(created.id);
      setDialog(null);
    } catch (cause) {
      setDialogError(getApiErrorMessage(cause));
    }
  }

  const scheduleColumns: Array<Column<ReportScheduleDto>> = [
    {
      key: 'report',
      header: 'گزارش',
      minWidth: 210,
      render: (row) => (
        <div className="col" style={{ gap: 2 }}>
          <span className="t-13 fw5 tx9">{row.templateName}</span>
          <span className="t-xs tx5">
            {row.scopeLabel} · <span className="mono">{row.format === 'pdf' ? 'PDF' : 'Excel'}</span>
          </span>
          {row.note && (
            <span className={`row g4 t-xs tx-${row.note.tone}`} style={{ marginTop: 2 }}>
              <Icon name={row.note.icon} size={12} />
              {row.note.text}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'when',
      header: 'زمان‌بندی',
      minWidth: 150,
      render: (row) => (
        <div className="col" style={{ gap: 2 }}>
          <span className="t-12 tx8">{row.frequencyLabel}</span>
          <span className={row.enabled ? 't-xs tx6' : 't-xs tx-wrn'}>{row.nextRunLabel}</span>
        </div>
      ),
    },
    {
      key: 'recipients',
      header: 'گیرندگان',
      minWidth: 150,
      render: (row) => (
        <div className="row g6">
          <span className="avs">
            {row.recipients
              .filter((person) => person.kind === 'user')
              .slice(0, 3)
              .map((person) => (
                <Avatar key={person.id} name={person.label} initials={person.initials ?? undefined} tone={person.avatarTone ?? undefined} size="s" />
              ))}
          </span>
          <span className="t-xs tx6">{row.recipientSummary}</span>
          {row.splitAmounts && (
            <Badge size="sm" tone="inf" title="گیرندگان مختلط: دو نسخه با و بدون مبلغ">
              دو نسخه
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'enabled',
      header: 'فعال',
      width: 70,
      align: 'center',
      render: (row) => (
        <Switch
          checked={row.enabled}
          label={`فعال یا غیرفعال کردن زمان‌بندی ${row.templateName}`}
          disabled={!canSchedule}
          onChange={async (next) => {
            try {
              await toggleSchedule({ scheduleId: row.id, enabled: next }).unwrap();
            } catch (cause) {
              toast.error(getApiErrorMessage(cause));
            }
          }}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 48,
      align: 'end',
      render: (row) => {
        const entries: MenuEntry[] = [
          { key: 'edit', label: 'ویرایش زمان‌بندی', icon: 'pencil', disabled: !canSchedule, onSelect: () => setDialog({ kind: 'schedule', schedule: row }) },
          {
            key: 'run',
            label: 'اجرای همین حالا',
            icon: 'play',
            disabled: !canGenerate,
            onSelect: async () => {
              try {
                await runNow(row.id).unwrap();
                setTab('outputs');
              } catch (cause) {
                toast.error(getApiErrorMessage(cause));
              }
            },
          },
          { key: 'sep', separator: true },
          { key: 'delete', label: 'حذف زمان‌بندی', icon: 'trash-2', tone: 'danger', disabled: !canSchedule, onSelect: () => setDialog({ kind: 'delete_schedule', schedule: row }) },
        ];
        return <Menu align="start" entries={entries} trigger={(props) => <IconButton {...props} icon="more-vertical" size="sm" label="گزینه‌های زمان‌بندی" />} />;
      },
    },
  ];

  const outputColumns: Array<Column<GeneratedReportDto>> = [
    {
      key: 'report',
      header: 'گزارش',
      minWidth: 210,
      render: (row) => (
        <div className="col" style={{ gap: 2 }}>
          <span className="t-13 fw5 tx9">{row.templateName}</span>
          <span className="t-xs tx5">
            {row.scopeLabel} · {row.rangeLabel}
          </span>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'منبع و مبلغ',
      minWidth: 150,
      render: (row) => (
        <div className="row g6 wrap">
          <Badge size="sm" tone={row.sourceKind === 'period_snapshot' ? 'ok' : 'wrn'}>
            {row.sourceKind === 'period_snapshot' ? 'دورهٔ بسته' : 'دورهٔ باز'}
          </Badge>
          <Badge size="sm" tone={row.includesAmounts ? 'pri' : 'neu'}>
            {row.includesAmounts ? 'با مبلغ' : 'بدون مبلغ'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      minWidth: 170,
      render: (row) => (
        <div className="col" style={{ gap: 2 }}>
          <Badge size="sm" tone={STATUS_TONE[row.status].tone}>
            {STATUS_TONE[row.status].label}
          </Badge>
          {row.error && <span className="t-xs tx-err">{row.error}</span>}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'ساخته‌شده',
      minWidth: 150,
      render: (row) => (
        <div className="col" style={{ gap: 2 }}>
          <span className="t-12 tx8">{formatRelativeTime(row.createdAt)}</span>
          <span className="t-xs tx5">
            {row.requestedByName} · {row.sizeLabel ?? '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 48,
      align: 'end',
      render: (row) => (
        <Menu
          align="start"
          entries={[
            {
              key: 'open',
              label: 'باز کردن پیش‌نمایش',
              icon: 'eye',
              onSelect: () => {
                setSelectedId(row.templateId);
                toast.success('قالب این خروجی در پیش‌نمایش باز شد.');
              },
            },
            { key: 'sep', separator: true },
            {
              key: 'delete',
              label: 'حذف خروجی',
              icon: 'trash-2',
              tone: 'danger',
              disabled: !canGenerate,
              onSelect: () => setDialog({ kind: 'delete_output', report: row }),
            },
          ]}
          trigger={(props) => <IconButton {...props} icon="more-vertical" size="sm" label="گزینه‌های خروجی" />}
        />
      ),
    },
  ];

  if (!canView) {
    return (
      <>
        <Topbar title="گزارش‌های مدیریتی" icon="bar-chart-3" />
        <Content>
          <Alert tone="inf">
            دسترسی مشاهدهٔ گزارش‌های مدیریتی را ندارید. از مدیر سازمان بخواهید دسترسی «مشاهدهٔ گزارش‌های مدیریتی» را بدهد.
          </Alert>
        </Content>
      </>
    );
  }

  return (
    <>
      <Topbar title="گزارش‌های مدیریتی" icon="bar-chart-3" />
      <Content>
        <PageHead
          title="گزارش‌های مدیریتی"
          subtitle="قالب‌های آماده، گزارش‌های زمان‌بندی‌شده و خروجی برای مدیران، کارفرما و واحد مالی"
          style={{ marginBottom: 18 }}
          actions={
            <>
              <AppButton
                icon="calendar-clock"
                disabled={!canSchedule}
                title={canSchedule ? undefined : 'دسترسی زمان‌بندی گزارش را ندارید.'}
                onClick={() => setDialog({ kind: 'schedule', schedule: null })}
              >
                زمان‌بندی جدید
              </AppButton>
              <AppButton
                variant="primary"
                icon="plus"
                disabled={!canCustom}
                title={canCustom ? undefined : 'دسترسی ساخت قالب سفارشی را ندارید.'}
                onClick={() => setDialog({ kind: 'custom' })}
              >
                ساخت گزارش سفارشی
              </AppButton>
            </>
          }
        />

        <div className="rpt-grid">
          <div className="col g16" style={{ minWidth: 0 }}>
            <Card>
              <CardHeader
                title="کتابخانهٔ قالب‌ها"
                icon="layout-template"
                iconClassName="tx-pri"
                subtitle="قالب‌های سازمان؛ داده‌ها از WBS، CBS، ریسک‌ها و گزارش‌های کارگاه پر می‌شود"
                action={
                  <TextInput
                    size="sm"
                    icon="search"
                    style={{ width: 200 }}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="جستجوی قالب"
                    aria-label="جستجوی قالب"
                  />
                }
              />
              <div style={{ padding: '12px 16px 0' }}>
                <SegmentedControl
                  activeKey={category}
                  onChange={(key) => setCategory(key as ReportCategory | 'all')}
                  items={[
                    { key: 'all', label: <span className="row g4">همه <span className="tx5">{toFaDigits(items.length)}</span></span> },
                    ...(library.data?.categoryCounts ?? []).map((entry) => ({
                      key: entry.category,
                      label: (
                        <span className="row g4">
                          {entry.label} <span className="tx5">{toFaDigits(entry.count)}</span>
                        </span>
                      ),
                    })),
                  ]}
                />
              </div>

              {library.isLoading ? (
                <div style={{ padding: 16 }}>
                  <SkeletonTable rows={4} />
                </div>
              ) : visible.length === 0 ? (
                <EmptyState
                  icon="file-search"
                  title="قالبی با این نام نیست"
                  description="نام دیگری را جستجو کنید یا دسته را روی «همه» بگذارید."
                  actions={
                    <AppButton size="sm" onClick={() => { setSearch(''); setCategory('all'); }}>
                      پاک کردن فیلترها
                    </AppButton>
                  }
                />
              ) : (
                <div className="grid c2 rpt-lib" style={{ padding: '12px 16px 16px', gap: 10 }}>
                  {visible.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === template?.id ? 'box rpt-tpl on row ai-s g12' : 'box rpt-tpl row ai-s g12'}
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={item.id === template?.id}
                    >
                      <IconBox icon={item.icon} tone="pri" />
                      <span className="col g4 grow" style={{ minWidth: 0 }}>
                        <span className="row g6 wrap">
                          <span className="t-13 fw6 tx9 trunc">{item.name}</span>
                          {item.id === template?.id && (
                            <Badge size="sm" tone="pri">
                              در پیش‌نمایش
                            </Badge>
                          )}
                          {item.status === 'preview' && <Badge size="sm">پیش‌نمایش</Badge>}
                          {!item.isSystem && <Badge size="sm" tone="acc">سفارشی</Badge>}
                        </span>
                        <span className="t-12 tx6">{item.description}</span>
                        <span className="row g6 wrap" style={{ marginTop: 2 }}>
                          {item.formats.map((format) => (
                            <Badge key={format} size="sm" mono>
                              {format === 'pdf' ? 'PDF' : 'Excel'}
                            </Badge>
                          ))}
                          <span className="t-xs tx5">
                            {`${toFaDigits(item.pageCount)} صفحه`}
                            {item.lastGeneratedAt ? ` · ${formatRelativeTime(item.lastGeneratedAt)}` : ' · هنوز تولید نشده'}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                action={<span className="t-12 tx5">ارسال خودکار به ایمیل و اعلان درون‌برنامه</span>}
              >
                <SegmentedControl
                  activeKey={tab}
                  onChange={(key) => setTab(key as 'schedules' | 'outputs')}
                  items={[
                    {
                      key: 'schedules',
                      icon: 'calendar-clock',
                      label: <span className="row g4">زمان‌بندی‌شده <span className="tx5">{toFaDigits(schedules.data?.length ?? 0)}</span></span>,
                    },
                    {
                      key: 'outputs',
                      icon: 'history',
                      label: <span className="row g4">خروجی‌های اخیر <span className="tx5">{toFaDigits(outputs.data?.length ?? 0)}</span></span>,
                    },
                  ]}
                />
              </CardHeader>

              {tab === 'schedules' ? (
                schedules.isLoading ? (
                  <SkeletonTable rows={5} />
                ) : (schedules.data ?? []).length === 0 ? (
                  <EmptyState
                    icon="calendar-clock"
                    title="هنوز زمان‌بندی‌ای نیست"
                    description="گزارش‌های تکرارشونده را زمان‌بندی کنید تا خودکار ساخته و فرستاده شوند."
                    actions={
                      <AppButton size="sm" variant="primary" icon="calendar-clock" disabled={!canSchedule} onClick={() => setDialog({ kind: 'schedule', schedule: null })}>
                        زمان‌بندی جدید
                      </AppButton>
                    }
                  />
                ) : (
                  <DataTable
                    rows={schedules.data ?? []}
                    columns={scheduleColumns}
                    getRowId={(row) => row.id}
                    minWidth={760}
                    rowClassName={(row) => (row.enabled ? undefined : 'muted')}
                    caption="گزارش‌های زمان‌بندی‌شده"
                  />
                )
              ) : outputs.isLoading ? (
                <SkeletonTable rows={5} />
              ) : (
                <DataTable
                  rows={outputs.data ?? []}
                  columns={outputColumns}
                  getRowId={(row) => row.id}
                  minWidth={760}
                  caption="خروجی‌های اخیر"
                  empty={<span className="t-12 tx5">هنوز خروجی‌ای ساخته نشده است.</span>}
                />
              )}
            </Card>
          </div>

          {library.isLoading || options.isLoading || !template || !library.data || !options.data ? (
            <Card>
              <SkeletonTable rows={8} />
            </Card>
          ) : (
            <ReportPreviewPanel
              key={template.id}
              template={template}
              library={library.data}
              options={options.data}
              canViewAmounts={canViewAmounts}
              canGenerate={canGenerate}
              canSchedule={canSchedule}
              projectId={activeProjectId}
              onProjectChange={setProjectId}
              downloading={generateState.isLoading}
              onDownload={(rangeId, disabled) => void onDownload(rangeId, disabled)}
              onSend={(rangeId, disabled) => setDialog({ kind: 'send', rangeId, disabled })}
              onSchedule={() => setDialog({ kind: 'schedule', schedule: null })}
            />
          )}
        </div>
      </Content>

      {dialog?.kind === 'schedule' && library.data && options.data && (
        <ScheduleDialog
          schedule={dialog.schedule}
          templates={library.data.items}
          options={options.data}
          canSendExternal={canSendExternal}
          busy={saveState.isLoading}
          error={dialogError}
          onSave={(input) => void onSaveSchedule(input)}
          onClose={() => {
            setDialog(null);
            setDialogError(null);
          }}
        />
      )}

      {dialog?.kind === 'custom' && library.data && (
        <CustomTemplateDialog
          library={library.data}
          busy={createState.isLoading}
          error={dialogError}
          onSave={(input) => void onCreateCustom(input)}
          onClose={() => {
            setDialog(null);
            setDialogError(null);
          }}
        />
      )}

      {dialog?.kind === 'send' && template && options.data && (
        <SendDialog
          templateName={template.name}
          includesAmounts={template.includesAmounts}
          options={options.data}
          canSendExternal={canSendExternal}
          busy={sendState.isLoading}
          error={dialogError}
          onSend={(recipients) => void onSend(recipients)}
          onClose={() => {
            setDialog(null);
            setDialogError(null);
          }}
        />
      )}

      {dialog?.kind === 'delete_schedule' && (
        <ConfirmDialog
          isOpen
          tone="danger"
          icon="trash-2"
          title="حذف زمان‌بندی"
          description={`«${dialog.schedule.templateName}» دیگر خودکار ساخته و فرستاده نمی‌شود. خروجی‌های قبلی دست‌نخورده می‌مانند.`}
          confirmLabel="حذف زمان‌بندی"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await deleteSchedule(dialog.schedule.id).unwrap();
              setDialog(null);
            } catch (cause) {
              toast.error(getApiErrorMessage(cause));
            }
          }}
        />
      )}

      {dialog?.kind === 'delete_output' && (
        <ConfirmDialog
          isOpen
          tone="danger"
          icon="trash-2"
          title="حذف خروجی"
          description={`فایل «${dialog.report.templateName} · ${dialog.report.rangeLabel}» حذف می‌شود و دیگر قابل دانلود نیست. می‌توانید دوباره از همین قالب بسازید.`}
          confirmLabel="حذف خروجی"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await deleteOutput(dialog.report.id).unwrap();
              setDialog(null);
            } catch (cause) {
              toast.error(getApiErrorMessage(cause));
            }
          }}
        />
      )}
    </>
  );
}
