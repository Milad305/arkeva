import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { FormField } from '@/shared/components/ui/FormField';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatFileSize, formatPercentAuto, toEnDigits, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { useImportTemplateMutation } from '../api/templatesApi';
import { downloadTemplateFiles } from '../services/templateFiles';
import type { ImportTemplateResultDto, ImportTemplateRowDto } from '../types';

export interface ImportTemplateDialogProps {
  projectTypes: Array<{ id: string; name: string }>;
  onClose: () => void;
  onImported: (templateId: string) => void;
}

const ROW_CLASS: Record<ImportTemplateRowDto['status'], string | undefined> = {
  ok: undefined,
  warning: 'row-wrn',
  error: 'row-err',
};

const COLUMNS: Array<Column<ImportTemplateRowDto>> = [
  {
    key: 'row',
    header: 'سطر',
    width: 56,
    render: (row) => <span className="t-xs tx5">{toFaDigits(row.row)}</span>,
  },
  {
    key: 'code',
    header: 'کد',
    width: 96,
    render: (row) => (
      <span className="mono t-xs" dir="ltr" style={{ color: row.status === 'error' ? '#B91C1C' : '#71717A' }}>
        {row.code || '—'}
      </span>
    ),
  },
  {
    key: 'title',
    header: 'عنوان',
    minWidth: 200,
    render: (row) => (
      <span className="t-12" style={{ paddingInlineStart: row.depth * 14, fontWeight: row.isParent ? 600 : 400 }}>
        {row.title || '—'}
      </span>
    ),
  },
  {
    key: 'weight',
    header: 'وزن یا سهم',
    minWidth: 92,
    render: (row) => (
      <span className="t-12 tx7">{row.weight === null ? '—' : formatPercentAuto(row.weight)}</span>
    ),
  },
  {
    key: 'time',
    header: 'شروع و مدت نسبی',
    minWidth: 118,
    render: (row) =>
      row.startOffsetWd === null && row.durationWd === null ? (
        <span className="t-xs tx5">—</span>
      ) : (
        <span className="t-12 tx7" dir="ltr" style={{ display: 'inline-block' }}>
          {`${toFaDigits(row.startOffsetWd ?? 0)} + ${toFaDigits(row.durationWd ?? 1)}`}
        </span>
      ),
  },
  {
    key: 'status',
    header: 'وضعیت',
    minWidth: 180,
    render: (row) =>
      row.error ? (
        <span className={`row g4 t-xs ${row.status === 'error' ? 'tx-err' : 'tx-wrn'}`}>
          <Icon name={row.status === 'error' ? 'x-circle' : 'alert-triangle'} size={13} />
          {row.error}
        </span>
      ) : (
        <span className="row g4 t-xs tx-ok">
          <Icon name="check-circle-2" size={13} />
          آماده
        </span>
      ),
  },
];

/**
 * «ساخت قالب از فایل» (`templates.md` ۵.۱) — ستون‌های ورود WBS به‌علاوهٔ شروع و مدت
 * نسبی، اقلام CBS و ضریب تقسیم، و یک برگهٔ CBS با سهم بودجه.
 *
 * در نسخهٔ نمایشی هر برگه یک فایل CSV جداست (`[پیش‌فرض فنی]`)؛ با بک‌اند یک فایل
 * Excel دوبرگه‌ای می‌شود. قالب ساخته‌شده **پیش‌نویس** است و تا انتشار در ساخت پروژه
 * دیده نمی‌شود.
 */
export function ImportTemplateDialog({ projectTypes, onClose, onImported }: ImportTemplateDialogProps) {
  const [name, setName] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<string>(projectTypes[0]?.id ?? 'residential');
  const [referenceDurationWd, setReferenceDurationWd] = useState(400);
  const [wbsFile, setWbsFile] = useState<File | null>(null);
  const [cbsFile, setCbsFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportTemplateResultDto | null>(null);
  const [sheet, setSheet] = useState<'wbs' | 'cbs'>('wbs');
  const [error, setError] = useState<string | null>(null);
  const [importTemplate, state] = useImportTemplateMutation();

  const typeOptions: Array<SelectOption<string>> = projectTypes.map((type) => ({ value: type.id, label: type.name }));
  const hasErrors = (preview?.issues ?? []).some((issue) => issue.severity === 'error');

  async function run(commit: boolean) {
    if (!wbsFile) return setError('اول برگهٔ WBS را انتخاب کنید.');
    if (name.trim().length < 3) return setError('نام قالب دست‌کم سه نویسه باشد.');
    setError(null);
    try {
      const result = await importTemplate({
        name: name.trim(),
        projectTypeId,
        wbsFile,
        cbsFile,
        referenceDurationWd,
        commit,
      }).unwrap();
      setPreview(result);
      if (commit && result.templateId) onImported(result.templateId);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      dismissOnBackdrop={false}
      title="ساخت قالب از فایل"
      description="ساختار WBS با وزن و زمان نسبی، و اقلام CBS با سهم بودجه"
      footer={
        <div className="row g8 wrap">
          <AppButton size="sm" icon="download" onClick={downloadTemplateFiles}>
            دانلود قالب
          </AppButton>
          <span className="grow" />
          <AppButton onClick={onClose} disabled={state.isLoading}>
            انصراف
          </AppButton>
          <AppButton icon="file-search" onClick={() => void run(false)} loading={state.isLoading && !preview}>
            بررسی فایل
          </AppButton>
          <AppButton
            variant="primary"
            icon="plus"
            disabled={!preview || hasErrors}
            loading={state.isLoading && Boolean(preview)}
            onClick={() => void run(true)}
          >
            ساخت قالب پیش‌نویس
          </AppButton>
        </div>
      }
    >
      <div className="col g14">
        <div className="grid c2 g12">
          <FormField label="نام قالب" required hint="در فهرست قالب‌ها همین دیده می‌شود.">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً: مدرسهٔ دوازده‌کلاسه" />
          </FormField>
          <FormField label="نوع پروژه" required>
            <Select options={typeOptions} value={projectTypeId} onChange={setProjectTypeId} label="نوع پروژه" />
          </FormField>
          <FormField
            label="مدت مرجع قالب (روز کاری)"
            required
            hint="زمان نسبی آیتم‌ها نسبت به این مدت مقیاس می‌شود."
          >
            <TextInput
              ltr
              value={toFaDigits(referenceDurationWd)}
              onChange={(event) =>
                setReferenceDurationWd(Math.max(1, Number(toEnDigits(event.target.value).replace(/[^\d]/g, '')) || 1))
              }
            />
          </FormField>
        </div>

        <div className="grid c2 g12">
          <Dropzone
            accept=".csv,.xlsx,.xls"
            icon="file-spreadsheet"
            title={wbsFile ? wbsFile.name : 'برگهٔ WBS'}
            description={
              wbsFile
                ? formatFileSize(wbsFile.size)
                : 'ستون‌های کد، عنوان، وزن در والد، واحد، روش، نقطهٔ عطف، شروع نسبی، مدت نسبی، اقلام CBS و ضریب تقسیم'
            }
            onFiles={(files) => {
              setWbsFile(files[0] ?? null);
              setPreview(null);
            }}
          />
          <Dropzone
            accept=".csv,.xlsx,.xls"
            icon="banknote"
            title={cbsFile ? cbsFile.name : 'برگهٔ CBS (اختیاری)'}
            description={
              cbsFile ? formatFileSize(cbsFile.size) : 'ستون‌های کد، عنوان، نوع هزینه، واحد و سهم بودجه؛ جمع سهم برگ‌ها ۱۰۰'
            }
            onFiles={(files) => {
              setCbsFile(files[0] ?? null);
              setPreview(null);
            }}
          />
        </div>

        {error && <Alert tone="err">{error}</Alert>}

        {preview && (
          <div className="col g10">
            <div className="row g8 wrap">
              <Badge tone="pri">{`${toFaDigits(preview.wbsCount)} آیتم WBS`}</Badge>
              <Badge tone="pri">{`${toFaDigits(preview.cbsCount)} قلم CBS`}</Badge>
              <Badge tone="pri">{`${toFaDigits(preview.linkCount)} اتصال`}</Badge>
              <Badge tone={Math.abs(preview.cbsShareSum - 100) < 0.0001 ? 'ok' : 'wrn'}>
                {`جمع سهم بودجه ${formatPercentAuto(preview.cbsShareSum)}`}
              </Badge>
            </div>

            {preview.issues.map((issue, index) => (
              <Alert key={`${issue.rule}-${index}`} tone={issue.severity === 'error' ? 'err' : 'wrn'}>
                {issue.message}
              </Alert>
            ))}

            <SegmentedControl
              activeKey={sheet}
              onChange={(key) => setSheet(key as 'wbs' | 'cbs')}
              items={[
                { key: 'wbs', label: `WBS (${toFaDigits(preview.wbsRows.length)})` },
                { key: 'cbs', label: `CBS (${toFaDigits(preview.cbsRows.length)})` },
              ]}
            />
            <DataTable
              rows={sheet === 'wbs' ? preview.wbsRows : preview.cbsRows}
              columns={COLUMNS}
              getRowId={(row) => `${sheet}-${row.row}`}
              minWidth={760}
              rowClassName={(row) => ROW_CLASS[row.status]}
              empty={<span className="t-12 tx5">این برگه ردیفی ندارد.</span>}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
