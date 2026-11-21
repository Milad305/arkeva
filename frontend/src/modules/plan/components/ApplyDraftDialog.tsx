import { useState } from 'react';

import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { TextArea } from '@/shared/components/ui/TextInput';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, formatRialParts, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { PlanDraftValidationDto } from '../types';
import { useApplyPlanDraftMutation, useGetPlanDraftImpactQuery } from '../api/planApi';

export interface ApplyDraftDialogProps {
  projectId: EntityId;
  versionName: string;
  draftRevision: number;
  validation: PlanDraftValidationDto;
  canViewAmounts: boolean;
  onClose: () => void;
  onApplied: () => void;
  onShowItem: (itemId: EntityId) => void;
}

/**
 * «اعمال بازنگری» (F04 ۵) — طراحی بوم ندارد (شکاف G3)؛ ساخته‌شده با W12 (تصمیم 1405/08/15).
 * خطاهای ۵.۱ مانع‌اند و هر کدام به آیتمش می‌برد؛ هشدارها و خلاصهٔ اثر ۵.۲ پیش از تأیید
 * دیده می‌شوند؛ یادداشت بازنگری اجباری است (AC-PV-10). همهٔ اعداد از سرور.
 */
export function ApplyDraftDialog({ projectId, versionName, draftRevision, validation, canViewAmounts, onClose, onApplied, onShowItem }: ApplyDraftDialogProps) {
  const impact = useGetPlanDraftImpactQuery(projectId);
  const [apply, applyState] = useApplyPlanDraftMutation();
  const [note, setNote] = useState('');
  const blocked = validation.errors.length > 0;
  const ready = !blocked && validation.canApply && note.trim().length >= 3;

  async function confirm() {
    try {
      await apply({ projectId, draftRevision, note: note.trim() }).unwrap();
      onApplied();
    } catch {
      // پیام خطا را میان‌افزار سراسری نشان می‌دهد؛ دیالوگ باز می‌ماند
    }
  }

  const data = impact.data;
  const bac = data?.bacChange ? BigInt(data.bacChange) : 0n;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={`اعمال «${versionName}»`}
      description="با اعمال، این نسخه قفل می‌شود و برنامهٔ جاری پروژه را می‌سازد؛ نسخهٔ قبلی برای مقایسه می‌ماند."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            بازگشت به ویرایش
          </AppButton>
          <AppButton variant="primary" icon="check" disabled={!ready} loading={applyState.isLoading} onClick={() => void confirm()}>
            اعمال {versionName}
          </AppButton>
        </>
      }
    >
      <div className="col g16">
        {blocked && (
          <div className="col g6">
            <Alert tone="err" icon="alert-octagon">
              <strong>{toFaDigits(validation.errors.length)} خطا مانع اعمال است.</strong> اول این‌ها را در حالت ویرایش رفع کنید.
            </Alert>
            {validation.errors.map((issue, index) => (
              <div key={index} className="row between g8 t-12" style={{ padding: '4px 4px' }}>
                <span className="row g6 ai-s tx8">
                  <Badge size="sm" tone="err" mono>
                    {issue.rule ?? 'V'}
                  </Badge>
                  {issue.message}
                </span>
                {issue.wbsItemId && (
                  <button type="button" className="link nowrap" onClick={() => onShowItem(issue.wbsItemId!)}>
                    نمایش
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="col g8">
          <span className="sect-t">اثر روی پروژه</span>
          {impact.isLoading ? (
            <SkeletonTable rows={3} />
          ) : impact.isError || !data ? (
            <EmptyState icon="server" title="خلاصهٔ اثر بارگذاری نشد" description="چند لحظهٔ دیگر دوباره امتحان کنید." actions={<AppButton size="sm" variant="outline" icon="refresh-cw" onClick={() => void impact.refetch()}>تلاش دوباره</AppButton>} />
          ) : (
            <>
              <div className="grid c4" style={{ gap: 8 }}>
                <Stat label="افزوده" value={data.added} tone="ok" />
                <Stat label="حذف‌شده" value={data.removed} tone="err" />
                <Stat label="جابه‌جاشده" value={data.moved} tone="pri" />
                <Stat label="تغییرکرده" value={data.changed} tone="wrn" />
              </div>
              {data.changedFields.length > 0 && (
                <span className="t-12 tx6">
                  تغییر فیلدها: {data.changedFields.map((field) => `${field.label} (${toFaDigits(field.count)})`).join('، ')}
                </span>
              )}
              <ul className="col g6 t-13" style={{ margin: 0, paddingInlineStart: 18 }}>
                <li>
                  پایان برنامه‌ای پروژه:{' '}
                  {data.finishShiftDays === 0 ? (
                    'بدون تغییر'
                  ) : (
                    <>
                      از {formatJalaliDate(data.currentFinish)} به <strong>{formatJalaliDate(data.draftFinish)}</strong> ({toFaDigits(Math.abs(data.finishShiftDays))} روز {data.finishShiftDays > 0 ? 'دیرتر' : 'زودتر'})
                    </>
                  )}
                </li>
                {canViewAmounts && (
                  <li>
                    بودجهٔ کل (BAC):{' '}
                    {bac === 0n ? 'بدون تغییر' : `${bac > 0n ? '+' : '−'}${formatRialParts((bac < 0n ? -bac : bac).toString()).value} ${formatRialParts((bac < 0n ? -bac : bac).toString()).unit}`}
                  </li>
                )}
                {data.cbs && (
                  <li>
                    CBS: {toFaDigits(data.cbs.added)} قلم افزوده، {toFaDigits(data.cbs.removed)} حذف‌شده، {toFaDigits(data.cbs.changed)} تغییرکرده
                    {canViewAmounts && data.cbs.budgetChange !== null && BigInt(data.cbs.budgetChange) !== 0n && (
                      <>
                        {' '}
                        · بودجهٔ CBS {BigInt(data.cbs.budgetChange) > 0n ? '+' : '−'}
                        {formatRialParts((BigInt(data.cbs.budgetChange) < 0n ? -BigInt(data.cbs.budgetChange) : BigInt(data.cbs.budgetChange)).toString()).value}{' '}
                        {formatRialParts((BigInt(data.cbs.budgetChange) < 0n ? -BigInt(data.cbs.budgetChange) : BigInt(data.cbs.budgetChange)).toString()).unit}
                      </>
                    )}
                    {data.cbs.isBudgetRevision && <strong className="tx-wrn"> — این نسخه «بازنگری بودجه» ثبت می‌شود (cbs.md ۷.۲).</strong>}
                  </li>
                )}
                {data.plannedTodayChange !== null && (
                  <li>
                    پیشرفت برنامه‌ای امروز:{' '}
                    {data.plannedTodayChange === 0 ? 'بدون تغییر' : `${data.plannedTodayChange > 0 ? '+' : ''}${formatPercentAuto(data.plannedTodayChange, 2)} (اگر مرجع PV همین نسخه شود)`}
                  </li>
                )}
                <li className={data.needsResolutionCount > 0 ? 'tx-wrn' : undefined}>
                  آیتم‌های گزارش در انتظار که «نیاز به تعیین تکلیف» می‌شوند: {toFaDigits(data.needsResolutionCount)}
                </li>
              </ul>
            </>
          )}
        </section>

        {validation.warnings.length > 0 && (
          <section className="col g6">
            <span className="sect-t">هشدارها — مانع اعمال نیستند</span>
            {validation.warnings.map((issue, index) => (
              <span key={index} className="row g6 ai-s t-12 tx7">
                <Icon name="alert-triangle" size={13} />
                {issue.message}
              </span>
            ))}
          </section>
        )}

        <div className="fg">
          <label className="lbl" htmlFor="apply-note">
            یادداشت بازنگری (اجباری)
          </label>
          <TextArea id="apply-note" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="چرا برنامه تغییر کرد؟ مثلاً «افزودن دهانهٔ S8 طبق دستور کار ۱۲ کارفرما»" />
          <span className="hint">در فهرست نسخه‌ها و اعلان اعمال (NT-PLN-01) دیده می‌شود.</span>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'err' | 'pri' | 'wrn' }) {
  return (
    <div className="box col g2" style={{ padding: '8px 10px' }}>
      <span className={`t-16 fw7 ${value > 0 ? `tx-${tone}` : 'tx5'}`}>{toFaDigits(value)}</span>
      <span className="t-xs tx6">{label}</span>
    </div>
  );
}
