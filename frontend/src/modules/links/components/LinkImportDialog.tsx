import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { formatQuantity, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { EntityId } from '@/shared/types/api';
import { Money } from '@/modules/cbs/components/Money';
import { useConfirmLinkImportMutation, usePreviewLinkImportMutation } from '../api/linksApi';
import { downloadLinksTemplate } from '../services/linksExport';
import type { LinkImportPreviewDto, LinkImportRowDto } from '../types';

export interface LinkImportDialogProps {
  projectId: EntityId;
  draftRevision: number;
  onClose: () => void;
}

const COLUMNS: Array<Column<LinkImportRowDto>> = [
  {
    key: 'row',
    header: 'ردیف',
    width: 52,
    render: (row) => <span className="t-12 tx5">{toFaDigits(row.row)}</span>,
  },
  {
    key: 'wbs',
    header: 'فعالیت',
    minWidth: 170,
    render: (row) => (
      <span className="col">
        <span className="mono t-xs tx5" dir="ltr">
          {row.wbsCode}
        </span>
        <span className="t-12">{row.wbsTitle ?? '—'}</span>
      </span>
    ),
  },
  {
    key: 'cbs',
    header: 'قلم CBS',
    minWidth: 150,
    render: (row) => (
      <span className="col">
        <span className="mono t-xs tx5" dir="ltr">
          {row.cbsCode}
        </span>
        <span className="t-12">{row.cbsTitle ?? '—'}</span>
      </span>
    ),
  },
  {
    key: 'value',
    header: 'مقدار یا مبلغ',
    minWidth: 100,
    render: (row) =>
      row.amount ? (
        <Money value={row.amount} short />
      ) : (
        <span className="t-12">{formatQuantity(row.quantity, null)}</span>
      ),
  },
  {
    key: 'sub',
    header: 'زیربودجه (سرور)',
    minWidth: 96,
    render: (row) =>
      row.subBudget ? <Money value={row.subBudget} short /> : <span className="tx5">—</span>,
  },
  {
    key: 'status',
    header: 'وضعیت',
    minWidth: 160,
    render: (row) =>
      row.errors.length === 0 ? (
        <span className="t-12 tx-ok">آماده</span>
      ) : (
        <span className="t-12 tx-err">{row.errors.join(' ')}</span>
      ),
  },
];

/**
 * ورود اتصال‌ها از Excel (cbs.md ۱۰؛ تصمیم 1405/08/15): ستون‌های کد WBS، کد CBS، مقدار یا
 * مبلغ. اتصال‌های هر فعالیتِ موجود در فایل با ردیف‌های فایل جایگزین می‌شود؛ همه یا هیچ.
 */
export function LinkImportDialog({ projectId, draftRevision, onClose }: LinkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LinkImportPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runPreview, previewState] = usePreviewLinkImportMutation();
  const [confirm, confirmState] = useConfirmLinkImportMutation();

  async function load(chosen: File) {
    setFile(chosen);
    setPreview(null);
    setError(null);
    try {
      setPreview(await runPreview({ projectId, draftRevision, file: chosen }).unwrap());
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  async function submit() {
    if (!file) return;
    try {
      await confirm({ projectId, draftRevision, file }).unwrap();
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="ورود اتصال‌ها از Excel"
      description="اتصال‌های هر فعالیتی که در فایل آمده با ردیف‌های فایل جایگزین می‌شود؛ بقیهٔ فعالیت‌ها دست نمی‌خورند."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="upload"
            disabled={!preview || preview.errorCount > 0}
            loading={confirmState.isLoading}
            onClick={() => void submit()}
          >
            {preview ? `ثبت ${toFaDigits(preview.rows.length)} اتصال` : 'ثبت'}
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        {file ? (
          <div className="box row between g8" style={{ padding: '10px 12px' }}>
            <span className="row g8 t-13" style={{ minWidth: 0 }}>
              <Icon name="file-spreadsheet" size={16} />
              <span className="trunc" dir="ltr">
                {file.name}
              </span>
            </span>
            <AppButton
              variant="ghost"
              size="sm"
              icon="refresh-cw"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setError(null);
              }}
            >
              فایل دیگر
            </AppButton>
          </div>
        ) : (
          <Dropzone
            accept=".xlsx,.csv"
            icon="file-spreadsheet"
            title="فایل اتصال‌ها را اینجا رها کنید"
            description="ستون‌ها: کد WBS، کد CBS، مقدار (برای قلم نرخ واحد) یا مبلغ (برای قلم مقطوع). زیربودجه را سرور می‌سازد."
            hint="XLSX یا CSV · حداکثر ۲۰ اتصال برای هر فعالیت"
            footer={
              <button type="button" className="link t-12" onClick={downloadLinksTemplate}>
                دانلود قالب
              </button>
            }
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
              <Badge tone="neu">{toFaDigits(preview.rows.length)} ردیف</Badge>
              <Badge tone="neu">{toFaDigits(preview.leafCount)} فعالیت</Badge>
              {preview.errorCount > 0 ? (
                <Badge tone="err">
                  {toFaDigits(preview.errorCount)} خطا — هیچ اتصالی ثبت نمی‌شود
                </Badge>
              ) : (
                <Badge tone="ok">بدون خطا</Badge>
              )}
              <span className="t-12 tx7">
                جمع زیربودجه: <Money value={preview.budgetTotal} className="t-12 fw6 tx9" />
              </span>
            </div>
            <div className="box" style={{ maxHeight: 320, overflow: 'auto', padding: 0 }}>
              <DataTable
                rows={preview.rows}
                columns={COLUMNS}
                getRowId={(row) => String(row.row)}
                minWidth={760}
                caption="پیش‌نمایش اتصال‌های فایل"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
