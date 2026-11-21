import { useState } from 'react';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon } from '@/shared/components/ui/Icon';
import { Radio } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatJalaliDate, formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import {
  useApplySyncMutation,
  useCreateSyncMutation,
  useExportProgressMutation,
  useGetExportPreviewQuery,
  useGetSyncQuery,
  useSelectAllChangesMutation,
  useUpdateSyncChangeMutation,
} from '../api/mspApi';
import type { ConflictResolution, SyncChangeDto } from '../types';

/**
 * W36 — همگام‌سازی با Microsoft Project (F15 ۷.۳ و ۷.۴).
 *
 * هر تغییر قابل‌انتخاب است و حذف‌ها پیش‌فرض انتخاب نمی‌شوند؛ تعارض باید تعیین تکلیف
 * شود و اعمال، بازنگری R‹n› می‌سازد (مبنا دست‌نخورده). جهت دوم فایل XML تازه می‌دهد.
 */
export default function MspSyncPage() {
  const { project } = useProjectContext();
  const canSync = useHasPermission('msp.sync');
  const canExport = useHasPermission('msp.export');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<{ number: number; count: number } | null>(null);
  const [replaceCalendar, setReplaceCalendar] = useState(false);
  const [reweight, setReweight] = useState(true);

  const session = useGetSyncQuery(sessionId ?? '', { skip: !sessionId });
  const exportPreview = useGetExportPreviewQuery(project.id);
  const [createSync, createState] = useCreateSyncMutation();
  const [updateChange] = useUpdateSyncChangeMutation();
  const [selectAll] = useSelectAllChangesMutation();
  const [applySync, applyState] = useApplySyncMutation();
  const [exportProgress, exportState] = useExportProgressMutation();

  const data = session.data ?? null;
  const changes = (data?.changes ?? []).filter(
    (change) => search.trim() === '' || change.code.includes(search.trim()) || change.title.includes(search.trim()),
  );
  const selectedCount = (data?.changes ?? []).filter((change) => change.selected).length;

  async function onFile(file: File) {
    try {
      const created = await createSync({ projectId: project.id, file }).unwrap();
      setSessionId(created.id);
      setApplied(null);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function onApply() {
    if (!sessionId) return;
    try {
      const result = await applySync({ sessionId, reweight }).unwrap();
      setApplied({ number: result.number, count: result.appliedCount });
      toast.success(`بازنگری R${toFaDigits(result.number)} با ${toFaDigits(result.appliedCount)} تغییر اعمال شد.`);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function onExport() {
    try {
      const result = await exportProgress({ projectId: project.id, replaceCalendar }).unwrap();
      const blob = new Blob([result.xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${toFaDigits(result.exportedCount)} پیشرفت در فایل XML تازه نوشته شد؛ فایل ورودی دست‌نخورده است.`);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  const columns: Array<Column<SyncChangeDto>> = [
    {
      key: 'select',
      header: '',
      width: 40,
      render: (change) => (
        <Checkbox
          checked={change.selected}
          disabled={!canSync || data?.status === 'applied'}
          onChange={(event) => void updateChange({ sessionId: sessionId!, changeId: change.id, selected: event.target.checked })}
          aria-label={`انتخاب تغییر ${change.code}`}
        />
      ),
    },
    {
      key: 'kind',
      header: 'تغییر',
      width: 110,
      render: (change) => (
        <Badge size="sm" tone={change.tone} icon={change.icon}>
          {change.kindLabel}
        </Badge>
      ),
    },
    {
      key: 'item',
      header: 'آیتم',
      minWidth: 200,
      render: (change) => (
        <div className="col" style={{ gap: 1 }}>
          <span className="mono t-xs tx5">{change.code}</span>
          <span className="t-12 fw5 tx9">{change.title}</span>
        </div>
      ),
    },
    { key: 'field', header: 'فیلد', minWidth: 110, render: (change) => <span className="t-12 tx6">{change.field}</span> },
    {
      key: 'current',
      header: 'فعلی در پروژه‌یار',
      minWidth: 140,
      render: (change) => (
        <span className="t-12 tx6" style={{ textDecoration: change.current === '—' ? 'none' : 'line-through' }}>
          {change.current}
        </span>
      ),
    },
    {
      key: 'incoming',
      header: 'در فایل MSP',
      minWidth: 180,
      render: (change) => (
        <div className="col" style={{ gap: 2 }}>
          <span className={change.kind === 'delete' ? 't-12 fw6 tx-err' : 't-12 fw6 tx9'}>{change.incoming}</span>
          {change.effect && <span className={`t-xs tx-${change.effectTone ?? 'neu'}`}>{change.effect}</span>}
        </div>
      ),
    },
  ];

  const conflicts = (data?.changes ?? []).filter((change) => change.kind === 'conflict');

  return (
    <Content>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 className="h-t2">همگام‌سازی با Microsoft Project</h2>
          <p className="sub" style={{ fontSize: 13 }}>
            {data
              ? `فایل ${data.fileName} · بارگذاری ${data.uploadedByName}، ${formatRelativeTime(data.uploadedAt)} · مقایسه با ${data.comparedWith}`
              : 'فایل تازهٔ برنامه را بارگذاری کنید تا تفاوتش با برنامهٔ جاری دیده شود'}
          </p>
        </div>
        <LinkButton to={ROUTES.wbs(project.id)} icon="x">
          لغو همگام‌سازی
        </LinkButton>
      </div>

      {!sessionId && (
        <Card style={{ marginBottom: 16 }}>
          <CardBody>
            <Dropzone
              accept=".xml,.mpp"
              icon="refresh-cw"
              title="فایل تازهٔ MSP را بارگذاری کنید"
              description="تفاوت‌ها بر پایهٔ UID با برنامهٔ جاری مقایسه می‌شود؛ برنامهٔ مبنا دست‌نخورده می‌ماند"
              hint="XML (MSPDI) یا MPP · حداکثر ۲۰ مگابایت"
              disabled={!canSync || createState.isLoading}
              onFiles={(files) => files[0] && void onFile(files[0])}
            />
            {!canSync && (
              <div style={{ paddingTop: 12 }}>
                <Alert tone="inf">دسترسی «همگام‌سازی MSP» را ندارید؛ از مدیر پروژه بخواهید فایل را همگام کند.</Alert>
              </div>
            )}
            {createState.isLoading && (
              <div style={{ paddingTop: 14 }}>
                <SkeletonTable rows={4} />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {session.isLoading && sessionId && (
        <Card>
          <SkeletonTable rows={6} />
        </Card>
      )}

      {data?.status === 'blocked' && (
        <Alert tone="wrn" action={<LinkButton size="sm" to={ROUTES.wbs(project.id)}>رفتن به نسخهٔ کاری</LinkButton>}>
          {data.blockedReason}
        </Alert>
      )}

      {data && data.status !== 'blocked' && (
        <>
          {data.sourceNote && (
            <Alert tone="inf" className="mb16">
              {data.sourceNote}
            </Alert>
          )}
          {applied && (
            <Alert tone="ok" className="mb16" action={<LinkButton size="sm" to={ROUTES.wbs(project.id)}>دیدن WBS</LinkButton>}>
              {`بازنگری R${toFaDigits(applied.number)} با ${toFaDigits(applied.count)} تغییر اعمال شد؛ برنامهٔ مبنا دست‌نخورده ماند.`}
            </Alert>
          )}

          <div className="row between wrap g8" style={{ marginBottom: 14 }}>
            <div className="row g6 wrap">
              {data.counts.map((entry) => (
                <Badge key={`${entry.kind}-${entry.label}`} tone={entry.tone}>
                  {`${toFaDigits(entry.count)} ${entry.label}`}
                </Badge>
              ))}
            </div>
            <span className="t-12 tx5">{`مقایسه با ${data.comparedWith} · بازنگری بعدی R${toFaDigits(data.nextRevisionNumber)}`}</span>
          </div>

          <div className="msp-grid">
            <Card>
              <div className="row g12 wrap" style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F5', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedCount === data.changes.length && data.changes.length > 0}
                  indeterminate={selectedCount > 0 && selectedCount < data.changes.length}
                  disabled={!canSync || data.status === 'applied'}
                  onChange={(event) => void selectAll({ sessionId: data.id, selected: event.target.checked })}
                  aria-label="انتخاب همهٔ تغییرها"
                />
                <span className="t-12 fw6 tx8">{`${toFaDigits(selectedCount)} از ${toFaDigits(data.changes.length)} تغییر انتخاب شده`}</span>
                <span className="t-xs tx5">حذف‌ها به‌طور پیش‌فرض انتخاب نمی‌شوند</span>
                <TextInput
                  size="sm"
                  icon="search"
                  className="ms-auto"
                  style={{ width: 200 }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="کد یا عنوان آیتم"
                  aria-label="جستجو در تغییرها"
                />
              </div>
              <DataTable
                rows={changes}
                columns={columns}
                getRowId={(change) => change.id}
                minWidth={880}
                caption="تغییرهای فایل MSP"
                rowClassName={(change) => (change.kind === 'delete' ? 'row-err' : change.kind === 'conflict' ? 'row-wrn' : undefined)}
                empty={<span className="t-12 tx5">تغییری با این جستجو نیست.</span>}
              />

              {conflicts.map((conflict) => (
                <div key={conflict.id} className="col g10" style={{ padding: '14px 16px', borderTop: '1px solid #F4F4F5', background: '#FFFBF5' }}>
                  <div className="row g8 wrap">
                    <Badge size="sm" tone="wrn" icon="git-compare-arrows">
                      تعارض
                    </Badge>
                    <span className="mono t-xs tx5">{conflict.code}</span>
                    <span className="t-13 fw6 tx9">{`${conflict.field} در هر دو طرف تغییر کرده است`}</span>
                  </div>
                  <div className="grid c2 g10">
                    <div className={conflict.resolution === 'keep_projeyar' ? 'opt-card on' : 'opt-card'}>
                      <Radio
                        name={`conflict-${conflict.id}`}
                        checked={conflict.resolution === 'keep_projeyar'}
                        disabled={data.status === 'applied'}
                        onChange={() => void updateChange({ sessionId: data.id, changeId: conflict.id, resolution: 'keep_projeyar' as ConflictResolution })}
                        label={
                          <span className="col">
                            <span className="t">نگه‌داشتن پروژه‌یار</span>
                            <span className="d">{conflict.current}</span>
                          </span>
                        }
                      />
                    </div>
                    <div className={conflict.resolution === 'accept_msp' ? 'opt-card on' : 'opt-card'}>
                      <Radio
                        name={`conflict-${conflict.id}`}
                        checked={conflict.resolution === 'accept_msp'}
                        disabled={data.status === 'applied'}
                        onChange={() => void updateChange({ sessionId: data.id, changeId: conflict.id, resolution: 'accept_msp' as ConflictResolution })}
                        label={
                          <span className="col">
                            <span className="t">پذیرش فایل MSP</span>
                            <span className="d">{conflict.incoming}</span>
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <div className="col g16">
              <Card>
                <CardHeader title="اثر روی پروژه" subtitle={`اگر ${toFaDigits(selectedCount)} تغییر انتخاب‌شده اعمال شود`} />
                <CardBody className="col">
                  {data.impact.map((row) => (
                    <div key={row.label} className="row g8" style={{ padding: '10px 0', borderBottom: '1px solid #F4F4F5' }}>
                      <span className="t-12 tx6 grow">{row.label}</span>
                      <span className="t-12 tx5" style={{ textDecoration: 'line-through' }}>
                        {row.before}
                      </span>
                      <span className="tx5" style={{ display: 'inline-flex' }}>
                        <Icon name="arrow-left" size={12} />
                      </span>
                      <span className={`t-13 fw7 tx-${row.tone}`}>{row.after}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Alert tone="inf" icon="history">
                برنامهٔ مبنا تغییر نمی‌کند؛ این تغییرها به‌عنوان <strong>{`بازنگری ${toFaDigits(data.nextRevisionNumber)}`}</strong> ذخیره
                می‌شود و در نمودار پیشرفت با خط «بازنگری‌شده» دیده می‌شود.
              </Alert>
              <Alert tone="wrn" icon="smartphone">
                آیتم‌های جدید پس از اعمال در اپ سرپرستان دیده نمی‌شوند تا به سرپرست{' '}
                <LinkButton size="sm" variant="ghost" to={ROUTES.assignment(project.id)}>
                  تخصیص
                </LinkButton>{' '}
                داده شوند.
              </Alert>

              <Card>
                <CardHeader title="ارسال به MSP" subtitle="جهت مخالف همگام‌سازی (۷.۴)" />
                <CardBody className="col g10">
                  <span className="t-12 tx6">
                    {exportPreview.data
                      ? `${toFaDigits(exportPreview.data.rows.length)} پیشرفت تأییدشده از ${exportPreview.data.sinceLabel} آمادهٔ نوشتن در فایل است.`
                      : 'در حال خواندن پیشرفت‌های آماده…'}
                  </span>
                  {exportPreview.data && exportPreview.data.proposals.length > 0 && (
                    <Alert tone="wrn">
                      {`${toFaDigits(exportPreview.data.proposals.length)} آیتم در پروژه‌یار ساخته شده و در فایل UID ندارد؛ این‌ها در فایل نوشته نمی‌شوند و باید در MSP دستی اضافه شوند.`}
                    </Alert>
                  )}
                  <Checkbox
                    checked={replaceCalendar}
                    onChange={(event) => setReplaceCalendar(event.target.checked)}
                    label="جایگزینی تقویم پروژه‌یار در فایل خروجی"
                  />
                  <AppButton
                    size="sm"
                    icon="file-output"
                    style={{ alignSelf: 'flex-start' }}
                    disabled={!canExport || !exportPreview.data || exportPreview.data.rows.length === 0}
                    loading={exportState.isLoading}
                    onClick={() => void onExport()}
                  >
                    دریافت فایل XML به‌روزشده
                  </AppButton>
                </CardBody>
              </Card>
            </div>
          </div>

          {data.status !== 'applied' && (
            <div className="row g8 wrap msp-actions">
              <span className="t-13 fw6 tx9">{`${toFaDigits(selectedCount)} تغییر انتخاب شده`}</span>
              <span className="t-12 tx5">
                {data.counts.map((entry) => `${toFaDigits(entry.count)} ${entry.label}`).join(' · ')}
              </span>
              <Checkbox
                checked={reweight}
                onChange={(event) => setReweight(event.target.checked)}
                label="وزن گروه‌های دارای آیتم تازه یا حذف‌شده دوباره پخش شود"
              />
              <span className="grow" />
              <LinkButton to={ROUTES.wbs(project.id)}>انصراف</LinkButton>
              <AppButton
                variant="primary"
                icon="check"
                loading={applyState.isLoading}
                disabled={!canSync || selectedCount === 0}
                onClick={() => void onApply()}
              >
                {`اعمال ${toFaDigits(selectedCount)} تغییر`}
              </AppButton>
            </div>
          )}
        </>
      )}

      {exportPreview.data && !sessionId && (
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="ارسال به MSP بدون همگام‌سازی" subtitle="پیشرفت تأییدشده را در فایل XML تازه بنویسید (۷.۴)" />
          <CardBody className="col g10">
            <span className="t-12 tx6">
              {`${toFaDigits(exportPreview.data.rows.length)} پیشرفت تأییدشده از ${exportPreview.data.sinceLabel} آماده است.`}
            </span>
            <DataTable
              rows={exportPreview.data.rows.slice(0, 8)}
              getRowId={(row) => row.id}
              minWidth={560}
              caption="پیشرفت‌های آمادهٔ ارسال"
              columns={[
                { key: 'code', header: 'کد', width: 90, render: (row) => <span className="mono t-xs tx6">{row.code}</span> },
                { key: 'title', header: 'فعالیت', minWidth: 200, render: (row) => <span className="t-12 tx8">{row.title}</span> },
                { key: 'percent', header: 'درصد', width: 80, render: (row) => <span className="t-12 fw5">{formatPercentAuto(row.percent)}</span> },
                {
                  key: 'date',
                  header: 'تاریخ مؤثر',
                  minWidth: 110,
                  render: (row) => <span className="t-12 tx7">{formatJalaliDate(row.asOfDate)}</span>,
                },
              ]}
              empty={<span className="t-12 tx5">هنوز پیشرفت تأییدشده‌ای برای ارسال نیست.</span>}
            />
            <AppButton
              size="sm"
              icon="file-output"
              style={{ alignSelf: 'flex-start' }}
              disabled={!canExport || exportPreview.data.rows.length === 0}
              loading={exportState.isLoading}
              onClick={() => void onExport()}
            >
              دریافت فایل XML به‌روزشده
            </AppButton>
          </CardBody>
        </Card>
      )}
    </Content>
  );
}
