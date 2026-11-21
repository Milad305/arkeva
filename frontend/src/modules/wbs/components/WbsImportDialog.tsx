import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { formatFileSize, formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { EntityId } from '@/shared/types/api';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { useConfirmWbsImportMutation, usePreviewWbsImportMutation } from '../api/wbsDraftApi';
import { downloadWbsTemplate } from '../services/wbsTemplate';
import type { WbsItemDto } from '../types';
import type {
  WbsImportIssueDto,
  WbsImportMode,
  WbsImportPreviewDto,
  WbsImportRowDto,
} from '../types/import';

export interface WbsImportDialogProps {
  project: ProjectDetailDto;
  draftRevision: number;
  /** آیتم‌های فعلی؛ خالی یعنی پروژهٔ بدون ساختار (W13). */
  items: WbsItemDto[];
  initialMode?: WbsImportMode;
  initialFile?: File | null;
  onClose: () => void;
  onImported: (firstId: EntityId | null) => void;
  /** فایل MSP (XML/MPP) — مسیر ورود از MSP (W34). */
  onMspFile: () => void;
}

const ISSUE_ICON: Record<WbsImportIssueDto['severity'], { icon: IconName; tone: string }> = {
  ok: { icon: 'check-circle-2', tone: 'tx-ok' },
  warning: { icon: 'alert-triangle', tone: 'tx-wrn' },
  error: { icon: 'x-circle', tone: 'tx-err' },
  info: { icon: 'info', tone: 'tx-inf' },
};

/** رنگ ردیف مشکل‌دار (بوم W39) — `app.css`. */
const ROW_CLASS: Record<WbsImportRowDto['status'], string | undefined> = {
  ok: undefined,
  warning: 'row-wrn',
  error: 'row-err',
  skipped: 'row-err',
};

const COLUMNS: Array<Column<WbsImportRowDto>> = [
  {
    key: 'code',
    header: 'کد',
    width: 96,
    render: (row) => (
      <span
        className="mono t-xs"
        dir="ltr"
        style={{
          color: row.status === 'error' || row.status === 'skipped' ? '#B91C1C' : '#71717A',
        }}
      >
        {row.code}
      </span>
    ),
  },
  {
    key: 'title',
    header: 'عنوان',
    minWidth: 220,
    render: (row) => (
      <span
        className="t-12"
        style={{
          paddingInlineStart: row.depth * 14,
          fontWeight: row.isParent ? 600 : 400,
          color: row.status === 'error' || row.status === 'skipped' ? '#B91C1C' : undefined,
        }}
      >
        {row.title}
        {row.status === 'skipped' && <span className="t-xs"> (نادیده — کد تکراری)</span>}
      </span>
    ),
  },
  {
    key: 'weight',
    header: 'وزن',
    width: 80,
    align: 'end',
    render: (row) =>
      row.weightWasEmpty ? (
        <span className="t-12 fw5 tx-wrn" title="وزن خالی؛ از باقی‌ماندهٔ ۱۰۰">
          {row.weight == null ? 'خالی' : `خالی ← ${formatPercentAuto(row.weight, 2)}`}
        </span>
      ) : (
        <span className="t-12 fw5">
          {row.weight == null ? '—' : formatPercentAuto(row.weight, 2)}
        </span>
      ),
  },
];

/**
 * W39 — آپلود فایل WBS (`features/wbs.md` ۶.۲ و ۸). همیشه به نسخهٔ کاری: پیش‌نمایش ۱۰ ردیف
 * اول، گزارش اعتبارسنجی، سپس «بارگذاری N آیتم». فقط Excel؛ فایل MSP به مسیر W34 می‌رود
 * (تصمیم 1405/08/15). شیوهٔ ورود طبق وضعیت پروژه (۶.۲).
 */
export function WbsImportDialog({
  project,
  draftRevision,
  items,
  initialMode,
  initialFile,
  onClose,
  onImported,
  onMspFile,
}: WbsImportDialogProps) {
  const isDraft = project.status === 'draft';
  const empty = items.length === 0;
  const [mode, setMode] = useState<WbsImportMode>(
    empty ? 'replace' : isDraft ? (initialMode ?? 'replace') : 'append',
  );
  const [parentId, setParentId] = useState('root');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WbsImportPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runPreview, previewState] = usePreviewWbsImportMutation();
  const [confirm, confirmState] = useConfirmWbsImportMutation();

  // آیتم‌هایی که فرزند می‌گیرند: والدها و برگ‌های بی‌گزارش (سرور دوباره می‌سنجد)
  const parentOptions: Array<SelectOption<string>> = useMemo(
    () => [
      { value: 'root', label: 'سطح اول' },
      ...items
        .filter(
          (item) =>
            !item.isLeaf ||
            (!item.progress?.actualPercent && item.progress?.pendingPercent == null),
        )
        .map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` })),
    ],
    [items],
  );

  const request = (chosen: File, nextMode = mode, nextParent = parentId) => ({
    projectId: project.id,
    draftRevision,
    file: chosen,
    mode: nextMode,
    parentId: nextMode === 'append' && nextParent !== 'root' ? nextParent : null,
  });

  async function load(chosen: File, nextMode = mode, nextParent = parentId) {
    if (/\.(xml|mpp)$/i.test(chosen.name)) {
      onMspFile();
      return;
    }
    setFile(chosen);
    setPreview(null);
    setError(null);
    try {
      setPreview(await runPreview(request(chosen, nextMode, nextParent)).unwrap());
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  useEffect(() => {
    if (initialFile) void load(initialFile);
    // فقط فایل رهاشده روی W13 در باز شدن
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!file) return;
    try {
      const result = await confirm(request(file)).unwrap();
      onImported(result.firstId);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const ext = file?.name.split('.').pop()?.toUpperCase() ?? '';
  const blocked = !preview || preview.importCount === 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title="آپلود فایل WBS"
      description="ساختار را از Excel وارد کنید؛ فایل Microsoft Project از «ورود از MSP» می‌آید."
      footer={
        <>
          <button type="button" className="link t-12 row g4" onClick={downloadWbsTemplate}>
            <Icon name="file-spreadsheet" size={14} />
            دانلود قالب Excel
          </button>
          <span className="row g8">
            <AppButton variant="ghost" onClick={onClose}>
              انصراف
            </AppButton>
            <AppButton
              variant="primary"
              icon="upload"
              disabled={blocked}
              loading={confirmState.isLoading}
              onClick={() => void submit()}
            >
              {preview ? `بارگذاری ${toFaDigits(preview.importCount)} آیتم` : 'بارگذاری'}
            </AppButton>
          </span>
        </>
      }
    >
      <div className="col g16">
        {!empty && (
          <div className="grid c2" style={{ gap: 12 }}>
            <div className="fg">
              <span className="lbl">شیوهٔ ورود</span>
              <SegmentedControl
                fill
                activeKey={mode}
                items={[
                  { key: 'replace', label: 'جایگزینی کامل', disabled: !isDraft },
                  { key: 'append', label: 'افزودن زیر یک آیتم' },
                ]}
                onChange={(key) => {
                  setMode(key as WbsImportMode);
                  if (file) void load(file, key as WbsImportMode);
                }}
              />
              <span className="hint">
                {isDraft
                  ? mode === 'replace'
                    ? 'همهٔ آیتم‌های فعلی مبنای کاری با فایل عوض می‌شود.'
                    : 'آیتم‌های فعلی می‌مانند.'
                  : 'پروژه فعال است: فقط افزودن در بازنگری کاری (wbs.md ۶.۲).'}
              </span>
            </div>
            {mode === 'append' && (
              <div className="fg">
                <span className="lbl">زیر کدام آیتم</span>
                <Select
                  size="sm"
                  label="آیتم مقصد"
                  options={parentOptions}
                  value={parentId}
                  onChange={(value) => {
                    setParentId(value);
                    if (file) void load(file, mode, value);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {file ? (
          <div
            className="row g12"
            style={{ padding: '12px 14px', border: '1px solid #E4E4E7', borderRadius: 12 }}
          >
            <Badge tone="pri" mono style={{ height: 34, padding: '0 10px' }}>
              {ext}
            </Badge>
            <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
              <span className="mono t-13 fw6 tx9 trunc" dir="ltr" style={{ textAlign: 'right' }}>
                {file.name}
              </span>
              <span className="t-xs tx5">
                {formatFileSize(file.size)}
                {preview && (
                  <>
                    {' · '}
                    <strong className="tx-ok">{toFaDigits(preview.totalRows)} ردیف</strong> شناسایی
                    شد
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              className="link t-12"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setError(null);
              }}
            >
              تغییر فایل
            </button>
          </div>
        ) : (
          <Dropzone
            accept=".xlsx,.csv,.xml,.mpp"
            icon="upload-cloud"
            title="فایل Excel ساختار را اینجا رها کنید"
            description="ستون‌ها: کد، عنوان، وزن در والد، واحد، مقدار کل، شروع و پایان برنامه‌ای، روش اندازه‌گیری، موبایل سرپرست، نقطهٔ عطف."
            hint="حداکثر ۲۰ مگابایت · ساختار از کد ساخته می‌شود: 1.2.3 فرزند 1.2 است"
            onFiles={(files) => files[0] && void load(files[0])}
          />
        )}

        {previewState.isLoading && <span className="t-12 tx6">در حال خواندن فایل…</span>}
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}

        {preview && (
          <>
            <div className="col g6">
              <div className="row between">
                <span className="t-12 fw6 tx8">
                  پیش‌نمایش — {toFaDigits(Math.min(10, preview.totalRows))} ردیف اول
                </span>
                <span className="t-xs tx5">ردیف‌های مشکل‌دار رنگی‌اند</span>
              </div>
              <div style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
                <DataTable
                  rows={preview.rows}
                  columns={COLUMNS}
                  getRowId={(row) => String(row.row)}
                  minWidth={420}
                  caption="پیش‌نمایش ردیف‌های فایل"
                  rowClassName={(row) => ROW_CLASS[row.status]}
                />
              </div>
            </div>
            <div className="col g8">
              <span className="t-12 fw6 tx8">گزارش اعتبارسنجی</span>
              {preview.issues.map((issue, index) => (
                <div key={index} className="row g8 ai-s t-12 tx8">
                  <span
                    className={ISSUE_ICON[issue.severity].tone}
                    style={{ display: 'inline-flex', marginTop: 1 }}
                  >
                    <Icon name={ISSUE_ICON[issue.severity].icon} size={15} />
                  </span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
