import { useEffect, useMemo, useState } from 'react';

import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Chip } from '@/shared/components/ui/Chip';
import { FormField } from '@/shared/components/ui/FormField';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import { useGetReportPreviewQuery, useGetReportRangesQuery } from '../api/managementReportsApi';
import type { ReportOptionsDto, ReportSectionKey, ReportTemplateDto, ReportTemplateListDto } from '../types';
import { ReportSheet } from './ReportSheet';

export interface ReportPreviewPanelProps {
  template: ReportTemplateDto;
  library: ReportTemplateListDto;
  options: ReportOptionsDto;
  canViewAmounts: boolean;
  canGenerate: boolean;
  canSchedule: boolean;
  projectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  onDownload: (rangeId: string, disabled: ReportSectionKey[]) => void;
  onSend: (rangeId: string, disabled: ReportSectionKey[]) => void;
  onSchedule: () => void;
  downloading: boolean;
}

/**
 * پیش‌نمایش زندهٔ گزارش (W25، ستون کناری): انتخاب پروژه و بازه، روشن و خاموش کردن
 * بخش‌ها، و صفحهٔ A4 با همان دادهٔ واقعی. اعداد از سرور می‌آیند (D07).
 */
export function ReportPreviewPanel({
  template,
  library,
  options,
  canViewAmounts,
  canGenerate,
  canSchedule,
  projectId,
  onProjectChange,
  onDownload,
  onSend,
  onSchedule,
  downloading,
}: ReportPreviewPanelProps) {
  const isPortfolio = template.scope === 'portfolio';
  const ranges = useGetReportRangesQuery({ projectId: isPortfolio ? null : projectId });
  const [rangeId, setRangeId] = useState<string>('last_week');
  const [disabled, setDisabled] = useState<ReportSectionKey[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setDisabled([]);
  }, [template.id]);

  useEffect(() => {
    if (ranges.data && !ranges.data.some((entry) => entry.id === rangeId)) setRangeId(ranges.data[0]?.id ?? 'last_week');
  }, [ranges.data, rangeId]);

  const preview = useGetReportPreviewQuery({
    templateId: template.id,
    projectId: isPortfolio ? null : projectId,
    rangeId,
    disabledSections: disabled,
    canViewAmounts,
  });

  const sectionLabels = useMemo(
    () => new Map(library.sections.map((section) => [section.key, section.label])),
    [library.sections],
  );

  const toggle = (key: ReportSectionKey) =>
    setDisabled((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));

  const range = ranges.data?.find((entry) => entry.id === rangeId);

  return (
    <Card className="col" style={{ gap: 0 }}>
      <CardHeader
        title={template.name}
        subtitle={
          <span className="row g6 wrap">
            <Badge size="sm" tone={template.audience === 'client' ? 'acc' : 'pri'}>
              {template.audience === 'client' ? 'کارفرما · بدون مبلغ' : 'داخلی'}
            </Badge>
            <Badge size="sm">{`${toFaDigits(template.sections.length)} بخش`}</Badge>
            {range && <Badge size="sm" tone={range.closed ? 'ok' : 'wrn'}>{range.closed ? 'دورهٔ بسته' : 'دورهٔ باز'}</Badge>}
          </span>
        }
        action={<IconButton icon="maximize-2" size="sm" label="نمایش تمام‌صفحه" onClick={() => setFullscreen(true)} />}
      />

      <div className="col g12" style={{ padding: '14px 16px' }}>
        <div className="grid c2 g10">
          <FormField label="پروژه">
            <Select
              size="sm"
              options={options.projects.map((project): SelectOption<string> => ({ value: project.id, label: project.name }))}
              value={isPortfolio ? null : projectId}
              onChange={onProjectChange}
              placeholder={isPortfolio ? 'همهٔ پروژه‌های فعال' : 'پروژه را انتخاب کنید'}
              disabled={isPortfolio}
              label="پروژه"
            />
          </FormField>
          <FormField label="بازه">
            <Select
              size="sm"
              options={(ranges.data ?? []).map((entry): SelectOption<string> => ({ value: entry.id, label: entry.label }))}
              value={rangeId}
              onChange={setRangeId}
              label="بازه"
            />
          </FormField>
        </div>

        <FormField label="بخش‌های گزارش" hint="بخش خاموش در این خروجی نمی‌آید؛ قالب تغییر نمی‌کند.">
          <div className="row g6 wrap">
            {template.sections.map((key) => (
              <Chip
                key={key}
                icon={disabled.includes(key) ? undefined : 'check'}
                selected={!disabled.includes(key)}
                onClick={() => toggle(key)}
              >
                {sectionLabels.get(key) ?? key}
              </Chip>
            ))}
          </div>
        </FormField>

        {preview.data?.amountsHiddenByPermission && (
          <Alert tone="inf">
            دسترسی «مشاهدهٔ مبالغ» را ندارید، پس بخش‌های مالی این گزارش بدون مبلغ تولید می‌شوند.
          </Alert>
        )}
      </div>

      <div className="rpt-stage">
        {preview.isLoading && <SkeletonTable rows={8} />}
        {preview.isError && (
          <Alert tone="err" action={<AppButton size="sm" onClick={() => preview.refetch()}>تلاش دوباره</AppButton>}>
            {getApiErrorMessage(preview.error)}
          </Alert>
        )}
        {preview.data && <ReportSheet preview={preview.data} />}
      </div>

      <div className="row g8 wrap" style={{ padding: '12px 16px' }}>
        <AppButton
          variant="primary"
          size="sm"
          icon="download"
          loading={downloading}
          disabled={!canGenerate || !preview.data}
          title={canGenerate ? undefined : 'دسترسی تولید گزارش را ندارید.'}
          onClick={() => onDownload(rangeId, disabled)}
        >
          دانلود PDF
        </AppButton>
        <AppButton
          size="sm"
          icon="send"
          disabled={!canGenerate || !preview.data}
          onClick={() => onSend(rangeId, disabled)}
        >
          ارسال به گیرندگان
        </AppButton>
        <AppButton
          size="sm"
          icon="calendar-clock"
          className="ms-auto"
          disabled={!canSchedule}
          title={canSchedule ? undefined : 'دسترسی زمان‌بندی گزارش را ندارید.'}
          onClick={onSchedule}
        >
          زمان‌بندی
        </AppButton>
      </div>

      {fullscreen && preview.data && (
        <Modal isOpen onClose={() => setFullscreen(false)} size="lg" title={template.name} description={preview.data.header.rangeLabel}>
          <div className="rpt-stage" style={{ margin: '-4px -22px -18px', maxHeight: '70vh', overflow: 'auto' }}>
            <ReportSheet preview={preview.data} compact={false} />
          </div>
        </Modal>
      )}
    </Card>
  );
}
