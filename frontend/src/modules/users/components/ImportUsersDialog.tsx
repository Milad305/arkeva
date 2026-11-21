import { useState } from 'react';

import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Modal } from '@/shared/components/ui/Modal';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import type { Tone } from '@/shared/types/tone';
import { useImportUsersMutation } from '../api/usersApi';
import { downloadImportTemplate, readImportFile } from '../services/usersCsv';
import type { ImportPreviewRow, ImportResultDto, ImportRowInput } from '../types';

const OUTCOME: Record<ImportPreviewRow['outcome'], { label: string; tone: Tone }> = {
  invite: { label: 'دعوت تازه', tone: 'inf' },
  add: { label: 'افزودن به پروژه', tone: 'ok' },
  unchanged: { label: 'بدون تغییر', tone: 'neu' },
  error: { label: 'خطا', tone: 'err' },
};

/**
 * ورود گروهی (F01 ۵.۶): الگو ← بارگذاری CSV ← پیش‌نمایش اعتبارسنجی سرور ← ثبت.
 * idempotent با موبایل: بارگذاری دوبارهٔ همان فایل چیزی را تکرار نمی‌کند.
 */
export function ImportUsersDialog({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRowInput[] | null>(null);
  const [preview, setPreview] = useState<ImportResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, state] = useImportUsersMutation();

  async function onFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    try {
      const parsed = await readImportFile(file);
      setFileName(file.name);
      setRows(parsed);
      setPreview(await run({ rows: parsed, commit: false }).unwrap());
    } catch (cause) {
      setError(cause instanceof Error && !('status' in cause) ? cause.message : getApiErrorMessage(cause));
    }
  }

  async function commit() {
    if (!rows) return;
    try {
      const result = await run({ rows, commit: true }).unwrap();
      toast.success(`${toFaDigits(result.counts.invite)} دعوت فرستاده شد و ${toFaDigits(result.counts.add)} عضویت ثبت شد.`);
      if (result.counts.error > 0) setPreview(result);
      else onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const columns: Array<Column<ImportPreviewRow>> = [
    { key: 'line', header: 'ردیف', width: 52, render: (row) => <span className="t-12 tx6">{toFaDigits(row.line)}</span> },
    { key: 'name', header: 'نام', minWidth: 120, render: (row) => <span className="t-13">{row.fullName || '—'}</span> },
    { key: 'mobile', header: 'موبایل', minWidth: 110, render: (row) => <span className="mono t-12" dir="ltr">{row.mobile}</span> },
    { key: 'project', header: 'پروژه', minWidth: 110, render: (row) => <span className="mono t-12">{row.projectCode}</span> },
    { key: 'role', header: 'نقش', minWidth: 100, render: (row) => <span className="t-12">{row.role}</span> },
    {
      key: 'outcome',
      header: 'نتیجه',
      minWidth: 220,
      render: (row) => (
        <span className="col" style={{ gap: 2 }}>
          <Badge size="sm" tone={OUTCOME[row.outcome].tone}>
            {OUTCOME[row.outcome].label}
          </Badge>
          <span className={`t-xs ${row.outcome === 'error' ? 'tx-err' : 'tx6'}`}>{row.message}</span>
        </span>
      ),
    },
  ];

  const ready = preview && !preview.committed && preview.counts.invite + preview.counts.add > 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="ورود گروهی کاربران"
      description="ستون‌ها: نام، موبایل، ایمیل (اختیاری)، کد پروژه، نقش. پیش از ثبت هر ردیف بررسی می‌شود؛ ردیف‌های خطادار ثبت نمی‌شوند."
      footer={
        <>
          <AppButton variant="ghost" icon="download" onClick={downloadImportTemplate} className="me-auto">
            دریافت الگو
          </AppButton>
          <AppButton variant="ghost" onClick={onClose}>
            {preview?.committed ? 'بستن' : 'انصراف'}
          </AppButton>
          <AppButton variant="primary" icon="check" disabled={!ready} loading={state.isLoading && Boolean(preview)} onClick={() => void commit()}>
            {preview ? `ثبت ${toFaDigits(preview.counts.invite + preview.counts.add)} ردیف` : 'ثبت'}
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <Dropzone
          accept=".csv,text/csv"
          onFiles={(files) => void onFiles(files)}
          icon="file-spreadsheet"
          title={fileName ?? 'فایل CSV را اینجا رها کنید یا انتخاب کنید'}
          description="در Excel: «ذخیره به‌عنوان» ← CSV UTF-8. حداکثر ۵۰۰ ردیف."
        />
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
        {preview && (
          <>
            <div className="row wrap g8 t-12">
              {(Object.keys(OUTCOME) as Array<ImportPreviewRow['outcome']>).map((key) => (
                <Badge key={key} tone={OUTCOME[key].tone}>
                  {`${OUTCOME[key].label}: ${toFaDigits(preview.counts[key])}`}
                </Badge>
              ))}
              <span className="ms-auto tx6">{`مجوز پس از ثبت: ${toFaDigits(preview.seats.used)} از ${toFaDigits(preview.seats.limit)}`}</span>
            </div>
            <DataTable rows={preview.rows} columns={columns} getRowId={(row) => String(row.line)} minWidth={720} caption="پیش‌نمایش ورود گروهی" />
          </>
        )}
      </div>
    </Modal>
  );
}
