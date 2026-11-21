import { RISK_LEVEL, RISK_STATUS } from '@/config/constants';
import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDate } from '@/shared/utils/date';
import { toBillions } from '@/shared/utils/num';
import type { RiskListItemDto } from '../types';
import { STRATEGY_LABEL } from './riskView';

/**
 * خروجی Excel دفتر ریسک (W18) — سرور `GET /projects/:pid/risks/export.xlsx` با همان فیلترها.
 * CSV سمت مرورگر از ردیف‌های فیلترشدهٔ صفحه. ستون مبلغ فقط با مجوز مبلغ پر است (AC-RK-10).
 */
export function exportRisks(fileName: string, rows: RiskListItemDto[], withProject: boolean): void {
  downloadCsv(
    fileName,
    toCsv(rows, [
      { header: 'شناسه', value: (risk) => risk.code },
      ...(withProject
        ? [{ header: 'پروژه', value: (risk: RiskListItemDto) => risk.projectName }]
        : []),
      { header: 'عنوان', value: (risk) => risk.title },
      { header: 'دسته', value: (risk) => risk.category },
      { header: 'احتمال', value: (risk) => risk.probability },
      { header: 'اثر', value: (risk) => risk.impact },
      { header: 'امتیاز', value: (risk) => risk.score },
      { header: 'سطح', value: (risk) => (risk.level ? RISK_LEVEL[risk.level] : 'ارزیابی‌نشده') },
      { header: 'وضعیت', value: (risk) => RISK_STATUS[risk.status] },
      {
        header: 'راهبرد',
        value: (risk) => (risk.responseStrategy ? STRATEGY_LABEL[risk.responseStrategy] : ''),
      },
      { header: 'مالک', value: (risk) => risk.owner.fullName },
      {
        header: 'موعد بعدی',
        value: (risk) => (risk.nextDueDate ? formatJalaliDate(risk.nextDueDate) : ''),
      },
      {
        header: 'اثر هزینه (میلیارد ریال)',
        value: (risk) => (risk.costImpact ? toBillions(risk.costImpact) : ''),
      },
      { header: 'اثر زمانی (روز)', value: (risk) => risk.scheduleImpactDays },
      { header: 'مرتبط با', value: (risk) => risk.linkSummary.text },
    ]),
  );
}
