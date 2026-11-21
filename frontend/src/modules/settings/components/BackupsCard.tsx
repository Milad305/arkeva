import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDateTime } from '@/shared/utils/date';
import {
  useDownloadFullExportMutation,
  useGetBackupsQuery,
  useManualBackupMutation,
  useRequestFullExportMutation,
  useSetBackupScheduleMutation,
} from '../api/settingsApi';
import { useSettingsContext } from '../pages/ProjectSettingsLayout';
import { openFileLink } from '../services/fileLink';
import type { BackupsDto, FullExportDto } from '../types';
import { SectionCard } from './SettingsKit';

const IN_FLIGHT = new Set<FullExportDto['status'] | undefined>(['queued', 'running']);

/** W30 «پشتیبان و خروجی» (F20 ۱۲): برنامهٔ خودکار، پشتیبان دستی و خروجی کامل پروژه. */
export function BackupsCard() {
  const { project, settings, canEdit } = useSettingsContext();
  const [setSchedule] = useSetBackupScheduleMutation();
  const [backup, backupState] = useManualBackupMutation();
  const [note, setNote] = useState('');
  const inFlight = IN_FLIGHT.has(settings.backups.fullExport?.status);
  // تا پایان ساخت خروجی کامل هر ۳ ثانیه؛ پایانش تنظیمات را تازه می‌کند
  const polled = useGetBackupsQuery(
    { projectId: project.id },
    { skip: !inFlight, pollingInterval: 3000 },
  );
  const backups: BackupsDto = polled.currentData ?? settings.backups;
  return (
    <SectionCard
      id="backups"
      icon="database-backup"
      title="پشتیبان و خروجی"
      subtitle="پشتیبان خودکار و دستی پیش از کارهای حساس (platform ۱۲)"
      readOnly={!canEdit}
    >
      <div className="row wrap g16">
        <div className="col grow" style={{ gap: 2, minWidth: 200 }}>
          <span className="t-13 fw6 tx9">پشتیبان‌گیری خودکار</span>
          <span className="t-12 tx5">
            روزانه هر شب ۰۲:۰۰ · هفتگی بامداد جمعه · ۳۰ نسخهٔ خودکار و ۱۰ دستی آخر
          </span>
        </div>
        <SegmentedControl
          activeKey={backups.schedule}
          onChange={(key) =>
            void setSchedule({ projectId: project.id, schedule: key as BackupsDto['schedule'] })
          }
          items={[
            { key: 'daily', label: 'روزانه', disabled: !canEdit },
            { key: 'weekly', label: 'هفتگی', disabled: !canEdit },
            { key: 'off', label: 'غیرفعال', disabled: !canEdit },
          ]}
        />
      </div>
      <div style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
        {backups.items.length === 0 && (
          <div className="t-12 tx5" style={{ padding: '10px 14px' }}>
            هنوز نسخه‌ای گرفته نشده؛ نخستین نسخهٔ خودکار امشب ساعت ۰۲:۰۰ گرفته می‌شود.
          </div>
        )}
        {backups.items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="row wrap g12"
            style={{ padding: '9px 14px', borderBottom: '1px solid #F4F4F5' }}
          >
            <span className="tx5" style={{ display: 'inline-flex' }}>
              <Icon name="archive" size={15} />
            </span>
            <span className="t-12 fw6 tx8" style={{ width: 140 }}>
              {formatJalaliDateTime(item.at)}
            </span>
            <span className="t-12 tx6 grow">{`${item.sizeText}${item.note ? ` · ${item.note}` : ''}`}</span>
            <Badge size="sm" tone={item.kind === 'manual' ? 'pri' : 'neu'}>
              {item.kind === 'manual' ? 'دستی' : 'خودکار'}
            </Badge>
          </div>
        ))}
        {canEdit && (
          <div className="row wrap g8" style={{ padding: '10px 14px', background: '#FAFAFA' }}>
            <TextInput
              size="sm"
              placeholder="یادداشت، مثلاً «پیش از ورود بازنگری ۳»"
              aria-label="یادداشت پشتیبان دستی"
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              style={{ flex: '1 1 220px' }}
            />
            <AppButton
              size="sm"
              variant="outline"
              icon="database-backup"
              loading={backupState.isLoading}
              onClick={() =>
                void backup({ projectId: project.id, note })
                  .unwrap()
                  .then(() => setNote(''))
              }
            >
              پشتیبان دستی
            </AppButton>
          </div>
        )}
      </div>
      <FullExportRow backups={backups} />
      <Alert tone="inf" icon="info">
        نسخه‌های پشتیبان رمزنگاری‌شده‌اند و بازگرداندنشان فقط از راه پشتیبانی است. خروجی XML از صفحهٔ
        MSP، XER از کارت P6 و Excel از صفحهٔ WBS در دسترس است.
      </Alert>
    </SectionCard>
  );
}

function FullExportRow({ backups }: { backups: BackupsDto }) {
  const { project } = useSettingsContext();
  const canExport = useHasPermission('export.full');
  const [request, requestState] = useRequestFullExportMutation();
  const [download, downloadState] = useDownloadFullExportMutation();
  if (!canExport) return null;
  const last = backups.fullExport;
  const busy = IN_FLIGHT.has(last?.status);
  const ready = last?.status === 'done';
  const status = !last
    ? `${backups.fullBackupSizeText === '—' ? '' : `حدود ${backups.fullBackupSizeText} · `}داده‌ها به CSV و JSON، عکس‌ها و گزارش‌ها`
    : busy
      ? 'در حال ساخت؛ چند دقیقه طول می‌کشد. می‌توانید صفحه را ترک کنید.'
      : ready
        ? `${last.sizeText ?? ''} · تا ${formatJalaliDateTime(last.expiresAt)} قابل دریافت${last.includesAmounts ? '' : ' · بدون مبلغ'}`
        : last.status === 'failed'
          ? (last.error ?? 'ساخت خروجی انجام نشد. دوباره بسازید.')
          : 'مهلت ۲۴ ساعتهٔ خروجی قبلی گذشته است؛ خروجی تازه بسازید.';
  return (
    <div
      className="row wrap g12"
      style={{ padding: '12px 14px', border: '1px solid #E4E4E7', borderRadius: 10 }}
    >
      <div className="col grow" style={{ gap: 2, minWidth: 200 }}>
        <span className="t-13 fw6 tx9">خروجی کامل پروژه (ZIP)</span>
        <span className={`t-12 ${last?.status === 'failed' ? 'tx-err' : 'tx5'}`}>{status}</span>
      </div>
      {ready && last && (
        <AppButton
          size="sm"
          icon="download"
          loading={downloadState.isLoading}
          onClick={() =>
            void download({ projectId: project.id, exportId: last.id })
              .unwrap()
              .then((link) => openFileLink(link.url, link.fileName))
          }
        >
          دریافت ZIP
        </AppButton>
      )}
      <AppButton
        size="sm"
        variant="outline"
        icon="archive"
        loading={requestState.isLoading || busy}
        disabled={busy}
        onClick={() => void request({ projectId: project.id })}
      >
        {ready ? 'ساخت دوباره' : 'ساخت خروجی کامل'}
      </AppButton>
    </div>
  );
}
