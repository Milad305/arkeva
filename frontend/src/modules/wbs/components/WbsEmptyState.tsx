import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { toFaDigits } from '@/shared/utils/num';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { useGetWizardTemplatesQuery } from '@/modules/projects/api/wizardApi';
import type { WbsPermissions } from '../hooks/useWbsPermissions';

export interface WbsEmptyStateProps {
  project: ProjectDetailDto;
  can: WbsPermissions;
  /** فایل Excel رهاشده یا «انتخاب فایل» ← W39. */
  onExcelFile: (file: File | null) => void;
  /** فایل MSP ← مسیر ورود از MSP (W34). */
  onMspFile: () => void;
}

const FORMATS: Array<{ icon: IconName; ext: string; label: string; color: string }> = [
  { icon: 'file-code-2', ext: '.xml', label: 'خروجی MSP', color: '#1A3354' },
  { icon: 'file-spreadsheet', ext: '.xlsx', label: 'قالب Excel', color: '#15803D' },
  { icon: 'file', ext: '.mpp', label: 'فایل پروژه', color: '#B45813' },
];

const MAX_SIZE = 20 * 1024 * 1024;

/**
 * W13 — پروژهٔ بدون ساختار (`features/wbs.md` ۸): سه راه شروع — آپلود فایل (Excel ← W39،
 * XML و MPP ← ورود از MSP)، شروع از قالب (W31، اعمال با F16) و ساخت دستی (W12).
 * قالب‌های پیشنهادی بر اساس نوع پروژه (تصمیم 1405/08/15: نمایش و پیوند به W31).
 */
export function WbsEmptyState({ project, can, onExcelFile, onMspFile }: WbsEmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canUpload = can.editStructure || can.mspImport;
  // قالب‌های منتشرشدهٔ سازمان به ترتیب پیشنهاد برای نوع پروژه (F16؛ همان فهرست مرحلهٔ ۴ ویزارد)
  const templates = (useGetWizardTemplatesQuery(project.projectTypeId).data ?? []).slice(0, 3);

  function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_SIZE)
      return setError(
        'حجم فایل بیش از ۲۰ مگابایت است. برای فایل‌های بزرگ‌تر با پشتیبانی تماس بگیرید.',
      );
    if (/\.(xml|mpp)$/i.test(file.name)) return onMspFile();
    if (/\.(xlsx|xls|csv)$/i.test(file.name)) return onExcelFile(file);
    setError('این قالب فایل پشتیبانی نمی‌شود؛ XML یا MPP از Microsoft Project، یا Excel.');
  }

  return (
    <div className="col" style={{ alignItems: 'center', gap: 20, padding: '36px 16px' }}>
      <div
        className="drop"
        style={{
          width: '100%',
          maxWidth: 640,
          padding: '40px 32px',
          gap: 10,
          borderColor: dragging ? 'var(--primary-500)' : undefined,
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (canUpload) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (canUpload) take(event.dataTransfer.files[0]);
        }}
      >
        <IconBox icon="upload-cloud" tone="pri" size="xl" />
        <h2 className="h-t3" style={{ fontSize: 18 }}>
          این پروژه هنوز WBS ندارد
        </h2>
        <p className="t-ui tx6 lh" style={{ maxWidth: 460, textAlign: 'center', margin: 0 }}>
          فایل XML خروجی Microsoft Project یا فایل Excel ساختار را اینجا رها کنید، از قالب شروع کنید
          یا ساختار را دستی بسازید.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.xml,.mpp"
          className="sr-input"
          aria-label="انتخاب فایل ساختار"
          onChange={(event) => take(event.target.files?.[0])}
        />
        <div className="row wrap g8" style={{ justifyContent: 'center', marginTop: 6 }}>
          {canUpload && (
            <AppButton variant="primary" icon="upload" onClick={() => inputRef.current?.click()}>
              انتخاب فایل…
            </AppButton>
          )}
          <LinkButton to={ROUTES.templates} variant="outline" icon="layout-template">
            شروع از قالب
          </LinkButton>
          {can.editStructure && (
            <LinkButton to={ROUTES.wbsEdit(project.id)} variant="ghost" icon="plus">
              ساخت دستی WBS
            </LinkButton>
          )}
        </div>
        {error && <span className="hint err">{error}</span>}
        <div className="row wrap g20" style={{ justifyContent: 'center', marginTop: 18 }}>
          {FORMATS.map((format) => (
            <span key={format.ext} className="col g4 t-sm tx6" style={{ alignItems: 'center' }}>
              <span
                className="icb lg"
                style={{ background: '#FAFAFA', border: '1px solid #E4E4E7', color: format.color }}
              >
                <Icon name={format.icon} size={18} />
              </span>
              <span className="mono" dir="ltr">
                {format.ext}
              </span>
              {format.label}
            </span>
          ))}
        </div>
        <p className="t-sm tx5" style={{ marginTop: 10, marginBottom: 0 }}>
          حداکثر حجم فایل ۲۰ مگابایت. برای فایل‌های بزرگ‌تر با پشتیبانی تماس بگیرید.
        </p>
      </div>

      {templates.length > 0 && (
        <section className="col g10" style={{ width: '100%', maxWidth: 980 }}>
          <div className="row between">
            <h3 className="h-sh">قالب‌های پیشنهادی برای این نوع پروژه</h3>
            <Link className="link row g4" to={ROUTES.templates}>
              همهٔ قالب‌ها
              <Icon name="chevron-left" size={12} />
            </Link>
          </div>
          <div className="grid c3 rsp" style={{ gap: 12 }}>
            {templates.map((template) => (
              <Link
                key={template.id}
                className="card col g8"
                to={`${ROUTES.templates}?template=${template.id}`}
                style={{ padding: 14 }}
              >
                <span className="row between">
                  <IconBox icon={template.icon} tone="pri" />
                  {template.recommended && (
                    <Badge size="sm" tone="acc">
                      پیشنهاد
                    </Badge>
                  )}
                </span>
                <span className="t-13 fw6">{template.title}</span>
                <span className="t-12 tx6">
                  {toFaDigits(template.wbsCount)} فعالیت
                  {template.cbsCount > 0 ? ' · CBS پیوست' : ''}
                </span>
                <span className="t-sm tx5">
                  استفاده‌شده در {toFaDigits(template.usedIn)} پروژهٔ سازمان
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
