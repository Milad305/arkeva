import { useState } from 'react';
import { UploadCloud, FileDown, CheckCircle2, AlertTriangle, XCircle, Check, X } from 'lucide-react';

import { Modal } from '@/shared/components/ui';
import { AppButton } from '@/shared/components/ui';
import { cn, toPersianDigits } from '@/shared/utils';
import { useImportWbsMutation } from '../api/wbsApi';
import { useValidateWbsImportQuery } from '../api/wbsApi';
import type { WbsImportValidation } from '../types';

// مودال آپلود WBS از MSP/Excel — مطابق designs/Modals.html #m-upload.
// دو state: dropzone (حالت اول) → preview (بعد از انتخاب فایل، با اعتبارسنجی).

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
}

export function WbsImportModal({ open, onClose, projectId }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // اعتبارسنجی فقط وقتی فایلی انتخاب شده
  const validateQuery = useValidateWbsImportQuery(
    fileName ? { fileName } : { fileName: '' },
    { skip: !fileName },
  );
  const validation: WbsImportValidation | undefined = validateQuery.data;

  const [importWbs] = useImportWbsMutation();

  function reset() {
    setFileName(null);
    setImporting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleConfirmImport() {
    if (!fileName) return;
    setImporting(true);
    try {
      await importWbs({ projectId, fileName }).unwrap();
      handleClose();
    } catch {
      // خطا توسط middleware سراسری هندل می‌شود
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="آپلود فایل WBS"
      subtitle="ساختار را از Microsoft Project یا Excel وارد کنید"
      icon={<UploadCloud className="w-5 h-5 text-info-500" />}
      footer={
        <>
          <AppButton variant="ghost" onClick={handleClose} disabled={importing}>
            انصراف
          </AppButton>
          <AppButton
            onClick={handleConfirmImport}
            disabled={!validation || importing}
            isLoading={importing}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            تأیید و بارگذاری
          </AppButton>
        </>
      }
    >
      {!fileName ? (
        <DropzoneState onFileSelected={(name) => setFileName(name)} />
      ) : !validation ? (
        <ValidatingState fileName={fileName} />
      ) : (
        <PreviewState fileName={fileName} validation={validation} onReset={() => setFileName(null)} />
      )}
    </Modal>
  );
}

// ─── state 1: dropzone ───

function DropzoneState({ onFileSelected }: { onFileSelected: (fileName: string) => void }) {
  return (
    <div>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 hover:bg-primary-50/30 transition-colors cursor-pointer"
        onClick={() => {
          // شبیه‌سازی انتخاب فایل
          onFileSelected('پروژه‌نگین-WBS-v3.xml');
        }}
      >
        <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <div className="text-[13.5px] text-gray-800 font-medium mb-1">
          انتخاب از سیستم یا فایل را اینجا رها کنید
        </div>
        <div className="text-xs text-gray-500">
          فایل‌های <span className="mono">.xml</span> (خروجی MSP) یا <span className="mono">.xlsx</span> (Excel)
        </div>
        <div className="text-xs text-gray-400 mt-1">حداکثر حجم: ۲۰ مگابایت</div>
      </div>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:underline border-0 bg-transparent cursor-pointer p-0"
      >
        <FileDown className="w-3.5 h-3.5" />
        <span>دانلود قالب Excel</span>
      </button>
    </div>
  );
}

// ─── state: validating ───

function ValidatingState({ fileName }: { fileName: string }) {
  return (
    <div className="py-8 text-center text-gray-500 text-sm">
      <div className="inline-block w-8 h-8 border-[3px] border-primary-200 border-t-primary-700 rounded-full animate-spin mb-3" />
      <div>در حال پردازش <span className="mono">{fileName}</span>…</div>
    </div>
  );
}

// ─── state 2: preview ───

function PreviewState({
  fileName,
  validation,
  onReset,
}: {
  fileName: string;
  validation: WbsImportValidation;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* file chip */}
      <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-md border border-gray-200">
        <div className="w-[38px] h-[46px] rounded-[5px] bg-primary-700 text-white inline-flex items-center justify-center text-[9px] font-bold flex-shrink-0">
          XML
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-gray-900 truncate">{fileName}</div>
          <div className="text-[11px] text-gray-500">
            ۱۲٫۴ مگابایت · <strong className="text-gray-800">{toPersianDigits(validation.totalDetected)} آیتم</strong> شناسایی شد
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="w-7 h-7 rounded-md text-gray-500 hover:bg-gray-200 inline-flex items-center justify-center border-0 bg-transparent"
          aria-label="حذف فایل"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* preview table */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11.5px] font-semibold text-gray-700">
          پیش‌نمایش (۱۰ آیتم اول)
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr>
              <th className="text-right text-[10px] font-semibold text-gray-500 px-2.5 py-1.5 border-b border-gray-200 bg-gray-50 uppercase">کد</th>
              <th className="text-right text-[10px] font-semibold text-gray-500 px-2.5 py-1.5 border-b border-gray-200 bg-gray-50 uppercase">عنوان</th>
              <th className="text-right text-[10px] font-semibold text-gray-500 px-2.5 py-1.5 border-b border-gray-200 bg-gray-50 uppercase">وزن</th>
            </tr>
          </thead>
          <tbody>
            {validation.preview.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-2.5 py-1.5 mono text-gray-500 text-[11px]">{toPersianDigits(item.code)}</td>
                <td className="px-2.5 py-1.5 text-gray-800">{item.title}</td>
                <td className="px-2.5 py-1.5 text-gray-700">
                  {item.weight !== null ? `${toPersianDigits(item.weight)}٪` : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* validation report */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11.5px] font-semibold text-gray-700">گزارش اعتبارسنجی</div>

        <ValidationRow
          type="ok"
          message={`${toPersianDigits(validation.totalDetected)} آیتم با موفقیت شناسایی شد`}
        />

        {validation.emptyWeights > 0 && (
          <ValidationRow
            type="warn"
            message={`${toPersianDigits(validation.emptyWeights)} آیتم وزن خالی دارند`}
          />
        )}

        {validation.weightSumWarnings.map((w, i) => (
          <ValidationRow
            key={i}
            type="warn"
            message={`مجموع وزن سطح ${toPersianDigits(w.level)} برابر ${toPersianDigits(w.sum)}٪ است (نیاز به بازنگری)`}
          />
        ))}

        {validation.duplicateCodes.map((code, i) => (
          <ValidationRow
            key={`dup-${i}`}
            type="error"
            message={`آیتم با کد تکراری ${toPersianDigits(code)}`}
          />
        ))}
      </div>
    </div>
  );
}

function ValidationRow({ type, message }: { type: 'ok' | 'warn' | 'error'; message: string }) {
  const config = {
    ok: { icon: <CheckCircle2 className="w-4 h-4 text-success-500" />, color: 'text-gray-700' },
    warn: { icon: <AlertTriangle className="w-4 h-4 text-warning-500" />, color: 'text-gray-700' },
    error: { icon: <XCircle className="w-4 h-4 text-error-500" />, color: 'text-error-700' },
  }[type];

  return (
    <div className={cn('flex items-center gap-2 text-[12.5px]', config.color)}>
      {config.icon}
      <span>{message}</span>
    </div>
  );
}
