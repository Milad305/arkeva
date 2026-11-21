import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { toFaDigits } from '@/shared/utils/num';
import { COST_TYPE_LABELS } from '@/shared/types/tone';
import type { EntityId } from '@/shared/types/api';
import type { PlanValidationIssue } from '@/modules/plan/types';
import type { OpError } from '@/modules/wbs/types/draft';
import type { CbsDraftTreeDto, CbsOp } from '../../types/draft';
import { Money } from '../Money';

export interface CbsEditSidePaneProps {
  view: CbsDraftTreeDto;
  ops: CbsOp[];
  opErrors: OpError[];
  nameOf: (id: EntityId | null) => string;
  canViewAmounts: boolean;
  canImport: boolean;
  onUndo: () => void;
  onShowItem: (id: EntityId) => void;
  onImport: () => void;
  onTemplate: () => void;
}

const CBS_CODES = new Set(['cbs_over_allocated', 'cbs_invalid_pricing', 'cbs_duplicate_code', 'cbs_unallocated']);

/** شرح کوتاه هر عمل برای «تغییرات این نشست». */
function describe(op: CbsOp, nameOf: (id: EntityId | null) => string): { icon: IconName; text: string } {
  switch (op.type) {
    case 'add':
      return { icon: 'plus', text: `قلم تازهٔ «${op.item.title}» زیر «${nameOf(op.parentId)}»` };
    case 'update': {
      const parts = Object.entries(op.patch).map(([key, value]) =>
        key === 'costType' ? `نوع ← ${COST_TYPE_LABELS[value as keyof typeof COST_TYPE_LABELS]}` : `${{ title: 'عنوان', code: 'کد', unit: 'واحد', supplier: 'تأمین‌کننده' }[key] ?? key} ← ${value || '—'}`,
      );
      return { icon: 'pencil', text: `«${nameOf(op.id)}»: ${parts.join('، ')}` };
    }
    case 'setPricing':
      return { icon: 'wallet', text: `قیمت «${nameOf(op.id)}» (${op.pricing === 'lump_sum' ? 'مقطوع' : 'نرخ واحد'})` };
    case 'move':
      return { icon: 'move', text: `جابه‌جایی «${nameOf(op.id)}» زیر «${nameOf(op.parentId)}»` };
    case 'remove':
      return { icon: 'trash-2', text: `حذف «${nameOf(op.id)}»` };
    case 'split':
      return { icon: 'split', text: `تقسیم «${nameOf(op.id)}» به ${toFaDigits(op.parts.length + 1)} بخش` };
    case 'close':
      return { icon: 'lock', text: `بستن «${nameOf(op.id)}»` };
  }
}

/** پنل کناری حالت ویرایش CBS: خلاصهٔ بودجه، اعتبارسنجی، تغییرات این نشست، Excel. */
export function CbsEditSidePane({ view, ops, opErrors, nameOf, canViewAmounts, canImport, onUndo, onShowItem, onImport, onTemplate }: CbsEditSidePaneProps) {
  const { errors, warnings } = view.validation;
  const cbsErrors = errors.filter((issue) => CBS_CODES.has(issue.code));
  const cbsWarnings = warnings.filter((issue) => CBS_CODES.has(issue.code));
  const otherErrors = errors.length - cbsErrors.length;
  const change = BigInt(view.summary.cbsBudget ?? '0') - BigInt(view.summary.currentCbsBudget ?? '0');

  return (
    <>
      {canViewAmounts && (
        <div className="col g8">
          <span className="sect-t">بودجهٔ نسخهٔ کاری</span>
          <div className="box col g8">
            <Row label="بودجهٔ CBS" value={<Money value={view.summary.cbsBudget} className="t-12 fw6 tx9" />} />
            {change !== 0n && (
              <Row
                label="تغییر نسبت به جاری"
                value={
                  <span className={change > 0n ? 'tx-err t-12 fw6 nowrap' : 'tx-ok t-12 fw6 nowrap'}>
                    {change > 0n ? '+' : '−'}
                    <Money value={(change < 0n ? -change : change).toString()} className="t-12 fw6" />
                  </span>
                }
              />
            )}
            <Row label="BAC (تخصیص‌یافته)" value={<Money value={view.summary.bac} />} />
            <Row label="تخصیص‌نیافته" value={BigInt(view.summary.unallocated ?? '0') > 0n ? <Money value={view.summary.unallocated} className="t-12 tx-wrn" /> : <span className="t-12 tx-ok">ندارد</span>} />
          </div>
          {view.budgetNeedsRevision && <span className="t-xs tx5">پروژه فعال است: هر تغییر نرخ، مقدار یا مبلغ، نسخه را «بازنگری بودجه» می‌کند.</span>}
        </div>
      )}

      <div className="col g8">
        <div className="row between">
          <span className="sect-t">اعتبارسنجی</span>
          {errors.length === 0 ? (
            <Badge size="sm" tone="ok" icon="check">
              بدون خطا
            </Badge>
          ) : (
            <Badge size="sm" tone="err">
              {toFaDigits(errors.length)} خطا
            </Badge>
          )}
        </div>
        {[...cbsErrors, ...cbsWarnings].map((issue, index) => (
          <IssueRow key={index} issue={issue} onShow={issue.cbsItemId ? () => onShowItem(issue.cbsItemId!) : undefined} />
        ))}
        {otherErrors > 0 && (
          <span className="hint err row g4 ai-s">
            <Icon name="list-tree" size={12} />
            {toFaDigits(otherErrors)} خطای دیگر در WBS همین نسخه است (مثلاً جمع وزن)؛ در حالت ویرایش WBS رفع کنید.
          </span>
        )}
        {cbsErrors.length === 0 && cbsWarnings.length === 0 && otherErrors === 0 && <span className="t-12 tx6">CBS این نسخه مشکلی ندارد.</span>}
      </div>

      <div className="col g8">
        <div className="row between">
          <span className="sect-t">تغییرات این نشست</span>
          {ops.length > 0 && (
            <AppButton variant="ghost" size="sm" icon="undo-2" onClick={onUndo} title="Ctrl+Z">
              واگرد
            </AppButton>
          )}
        </div>
        {ops.length === 0 ? (
          <span className="t-12 tx6">تغییر ذخیره‌نشده‌ای نیست.</span>
        ) : (
          ops.map((op, index) => {
            const { icon, text } = describe(op, nameOf);
            const error = opErrors.find((entry) => entry.index === index);
            return (
              <div key={index} className="col g2">
                <span className={`row g6 ai-s t-12 ${error ? 'tx-err' : 'tx7'}`}>
                  <Icon name={icon} size={13} />
                  {text}
                </span>
                {error && <span className="hint err">{error.message} — این عمل را واگرد کنید.</span>}
              </div>
            );
          })
        )}
      </div>

      {canImport && (
        <div className="col g4">
          <span className="sect-t" style={{ marginBottom: 4 }}>
            Excel
          </span>
          <AppButton variant="outline" size="sm" block icon="file-spreadsheet" style={{ justifyContent: 'flex-start' }} onClick={onImport} disabled={ops.length > 0} title={ops.length > 0 ? 'اول تغییرهای این نشست را ذخیره کنید' : undefined}>
            ورود اقلام از Excel
          </AppButton>
          <AppButton variant="ghost" size="sm" block icon="file-down" style={{ justifyContent: 'flex-start' }} onClick={onTemplate}>
            دانلود قالب
          </AppButton>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row between g8 t-12 tx7">
      <span>{label}</span>
      {value}
    </div>
  );
}

function IssueRow({ issue, onShow }: { issue: PlanValidationIssue; onShow?: () => void }) {
  return (
    <div className="row between g8 t-12">
      <span className={`row g6 ai-s ${issue.severity === 'error' ? 'tx-err' : 'tx-wrn'}`}>
        <Badge size="sm" tone={issue.severity === 'error' ? 'err' : 'wrn'} mono>
          {issue.rule ?? 'V'}
        </Badge>
        <span>{issue.message}</span>
      </span>
      {onShow && (
        <button type="button" className="link nowrap t-12" onClick={onShow}>
          نمایش
        </button>
      )}
    </div>
  );
}
