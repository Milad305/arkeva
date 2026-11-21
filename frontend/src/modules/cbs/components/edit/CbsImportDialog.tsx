import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { formatQuantity, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { COST_TYPE_LABELS } from '@/shared/types/tone';
import type { EntityId } from '@/shared/types/api';
import { useConfirmCbsImportMutation, usePreviewCbsImportMutation } from '../../api/cbsDraftApi';
import type { CbsDraftItemDto, CbsImportMode, CbsImportPreviewDto, CbsImportRowDto } from '../../types/draft';
import { Money } from '../Money';

const PREVIEW_COLUMNS: Array<Column<CbsImportRowDto>> = [
  { key: 'row', header: 'ردیف', width: 52, render: (row) => <span className="t-12 tx5">{toFaDigits(row.row)}</span> },
  { key: 'code', header: 'کد', minWidth: 80, render: (row) => <span className="mono t-12" dir="ltr">{row.code}</span> },
  { key: 'title', header: 'عنوان', minWidth: 160, render: (row) => <span className={row.isGroup ? 't-12 fw6' : 't-12'}>{row.title}</span> },
  { key: 'type', header: 'نوع', minWidth: 90, render: (row) => <span className="t-12">{row.costType ? COST_TYPE_LABELS[row.costType] : '—'}</span> },
  { key: 'estimate', header: 'برآورد', minWidth: 100, render: (row) => <span className="t-12">{row.isGroup ? 'گروه' : row.pricing === 'lump_sum' ? 'مقطوع' : formatQuantity(row.qty, row.unit)}</span> },
  { key: 'budget', header: 'بودجه (سرور)', minWidth: 90, render: (row) => (row.budget ? <Money value={row.budget} short /> : <span className="tx5">—</span>) },
  {
    key: 'status',
    header: 'وضعیت',
    minWidth: 160,
    render: (row) => (row.errors.length === 0 ? <span className="t-12 tx-ok">آماده</span> : <span className="t-12 tx-err">{row.errors.join(' ')}</span>),
  },
];

export interface CbsImportDialogProps {
  projectId: EntityId;
  draftRevision: number;
  isDraftProject: boolean;
  groups: CbsDraftItemDto[];
  onClose: () => void;
  onImported: () => void;
}

/**
 * ورود اقلام CBS از Excel (cbs.md ۱۰؛ تصمیم 1405/08/15): پیش‌نویس جایگزینی کامل یا افزودن،
 * پروژهٔ فعال فقط افزودن زیر یک گروه. سرور فایل را می‌خواند، بودجه را خودش می‌سازد و
 * ستون بودجهٔ فایل را نادیده می‌گیرد. ورود همه یا هیچ است.
 */
export function CbsImportDialog({ projectId, draftRevision, isDraftProject, groups, onClose, onImported }: CbsImportDialogProps) {
  const [mode, setMode] = useState<CbsImportMode>('append');
  const [parentId, setParentId] = useState<string>('root');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CbsImportPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runPreview, previewState] = usePreviewCbsImportMutation();
  const [confirm, confirmState] = useConfirmCbsImportMutation();

  const parentOptions: Array<SelectOption<string>> = [
    { value: 'root', label: 'سطح اول' },
    ...groups.map((group) => ({ value: group.id, label: `${group.code} · ${group.title}` })),
  ];
  const request = (chosen: File) => ({ projectId, draftRevision, file: chosen, mode, parentId: mode === 'append' && parentId !== 'root' ? parentId : null });

  async function load(chosen: File) {
    setFile(chosen);
    setPreview(null);
    setError(null);
    try {
      setPreview(await runPreview(request(chosen)).unwrap());
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  async function submit() {
    if (!file) return;
    try {
      await confirm(request(file)).unwrap();
      onImported();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="ورود اقلام CBS از Excel"
      description="ردیف‌ها به نسخهٔ کاری افزوده می‌شوند و پیش از ذخیره پیش‌نمایش می‌گیرند."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="upload" disabled={!preview || preview.errorCount > 0} loading={confirmState.isLoading} onClick={() => void submit()}>
            {preview ? `افزودن ${toFaDigits(preview.itemCount)} ردیف` : 'افزودن'}
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <div className="grid c2" style={{ gap: 12 }}>
          <div className="fg">
            <span className="lbl">شیوهٔ ورود</span>
            <SegmentedControl
              fill
              activeKey={mode}
              items={[
                { key: 'append', label: 'افزودن' },
                { key: 'replace', label: 'جایگزینی کامل', disabled: !isDraftProject },
              ]}
              onChange={(key) => {
                setMode(key as CbsImportMode);
                resetFile();
              }}
            />
            <span className="hint">{isDraftProject ? 'جایگزینی همهٔ اقلام فعلی مبنای کاری را پاک می‌کند.' : 'در پروژهٔ فعال فقط افزودن ممکن است (بازنگری بودجه).'}</span>
          </div>
          {mode === 'append' && (
            <div className="fg">
              <span className="lbl">زیر کدام گروه</span>
              <Select
                size="sm"
                label="گروه مقصد"
                options={parentOptions}
                value={parentId}
                onChange={(value) => {
                  setParentId(value);
                  resetFile();
                }}
              />
            </div>
          )}
        </div>

        {file ? (
          <div className="box row between g8" style={{ padding: '10px 12px' }}>
            <span className="row g8 t-13" style={{ minWidth: 0 }}>
              <Icon name="file-spreadsheet" size={16} />
              <span className="trunc" dir="ltr">
                {file.name}
              </span>
            </span>
            <AppButton variant="ghost" size="sm" icon="refresh-cw" onClick={resetFile}>
              فایل دیگر
            </AppButton>
          </div>
        ) : (
          <Dropzone
            accept=".xlsx,.csv"
            icon="file-spreadsheet"
            title="فایل Excel را اینجا رها کنید"
            description="ستون‌ها: کد، عنوان، نوع هزینه، شیوهٔ قیمت، واحد، مقدار برآورد، نرخ واحد، مبلغ مقطوع، تأمین‌کننده. گروه‌ها از پیشوند کد شناخته می‌شوند."
            hint="XLSX یا CSV · بودجه را سرور از مقدار و نرخ می‌سازد"
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
            <div className="row wrap g8">
              <Badge tone="neu">{toFaDigits(preview.itemCount)} ردیف</Badge>
              {preview.errorCount > 0 ? <Badge tone="err">{toFaDigits(preview.errorCount)} خطا — هیچ ردیفی وارد نمی‌شود</Badge> : <Badge tone="ok">بدون خطا</Badge>}
              <span className="t-12 tx7">
                بودجهٔ افزوده: <Money value={preview.budgetTotal} className="t-12 fw6 tx9" />
              </span>
            </div>
            <div className="box" style={{ maxHeight: 320, overflow: 'auto', padding: 0 }}>
              <DataTable rows={preview.rows} columns={PREVIEW_COLUMNS} getRowId={(row) => String(row.row)} minWidth={720} caption="پیش‌نمایش ردیف‌های فایل" />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
