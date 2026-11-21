import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { formatQuantity, toFaDigits } from '@/shared/utils/num';
import { COST_TYPE_LABELS, type CostType } from '@/shared/types/tone';
import { CommitInput, Field, Lock } from '@/modules/plan/components/EditFields';
import { parseNumber } from '@/modules/plan/services/parseNumber';
import type { PlanValidationIssue } from '@/modules/plan/types';
import type { PricingMode } from '../../types';
import type { CbsDraftItemDto, CbsOp, CbsPricingInput } from '../../types/draft';
import { Money } from '../Money';

const COST_TYPES: CostType[] = ['materials', 'labor', 'equipment', 'subcontract', 'transport', 'overhead', 'other'];
const TYPE_OPTIONS: Array<SelectOption<CostType>> = COST_TYPES.map((type) => ({ value: type, label: COST_TYPE_LABELS[type] }));
const COMMON_UNITS = ['تن', 'مترمکعب', 'مترمربع', 'متر', 'عدد', 'نفرساعت', 'نفرروز', 'دستگاه‌روز', 'دستگاه‌ماه', 'سرویس'];

export interface CbsItemFormProps {
  item: CbsDraftItemDto;
  issues: PlanValidationIssue[];
  childCount: number;
  /** پروژهٔ فعال: نرخ و مقدار و مبلغ فقط با بازنگری بودجه (۷.۱). */
  budgetNeedsRevision: boolean;
  canReviseBudget: boolean;
  canViewAmounts: boolean;
  onOp: (op: CbsOp) => void;
  onAddChild: () => void;
  onSplit: () => void;
  onClose: () => void;
  onRemove: () => void;
  onRequestRevision?: () => void;
}

const digits = (text: string) => text.replace(/[^\d۰-۹]/g, '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

/**
 * پنل «ویرایش قلم» حالت ویرایش CBS — فیلدهای cbs.md ۴.۱ و قفل‌های ۴.۴ با دلیل و راه
 * جایگزین. هر فیلد با ترک آن یک عمل می‌سازد؛ بودجه را سرور می‌سازد (`round(مقدار × نرخ)`).
 */
export function CbsItemForm({
  item,
  issues,
  childCount,
  budgetNeedsRevision,
  canReviseBudget,
  canViewAmounts,
  onOp,
  onAddChild,
  onSplit,
  onClose,
  onRemove,
  onRequestRevision,
}: CbsItemFormProps) {
  const update = (patch: Extract<CbsOp, { type: 'update' }>['patch']) => onOp({ type: 'update', id: item.id, patch });
  const pricing = (input: Partial<CbsPricingInput>) =>
    onOp({
      type: 'setPricing',
      id: item.id,
      pricing: input.pricing ?? item.pricingMode ?? 'unit_rate',
      unit: input.unit !== undefined ? input.unit : item.unit,
      qty: input.qty !== undefined ? input.qty : item.estimatedQuantity,
      rate: input.rate !== undefined ? input.rate : item.unitRate,
      lump: input.lump !== undefined ? input.lump : item.lumpSumAmount,
    });
  const leaf = item.isLeaf;
  const budgetLocked = !canViewAmounts
    ? 'مبالغ برای شما نمایش داده نمی‌شود (cbs.view_amounts).'
    : budgetNeedsRevision && !canReviseBudget && item.change !== 'added'
      ? 'در پروژهٔ فعال نرخ، مقدار و مبلغ فقط با بازنگری بودجه عوض می‌شوند (cbs.md ۷.۱).'
      : undefined;
  const mode: PricingMode | null = item.pricingMode;

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      <div className="pane-h col g4">
        <span className="row wrap g6">
          <Badge tone="neu" mono icon={leaf ? 'file-text' : 'folder'}>
            <span dir="ltr">{item.code}</span>
          </Badge>
          {item.change === 'added' && <Badge tone="ok">جدید</Badge>}
          {item.budgetChanged && (
            <Badge tone="wrn" icon="wallet" title="با اعمال، این نسخه «بازنگری بودجه» می‌شود">
              بازنگری بودجه
            </Badge>
          )}
          {item.hasPostedCost && (
            <Badge tone="inf" icon="receipt" title="هزینهٔ ثبت‌شده (posted)">
              هزینه دارد
            </Badge>
          )}
        </span>
        <h2 className="h-t3">ویرایش قلم</h2>
      </div>

      <div className="col g12" style={{ padding: '14px 16px' }}>
        <Field label="عنوان">
          <CommitInput key={`t:${item.id}:${item.title}`} value={item.title} onCommit={(title) => update({ title })} />
        </Field>
        <div className="grid c2" style={{ gap: 10 }}>
          <Field label="کد" hint="فقط نمایشی؛ اتصال‌ها با شناسه است">
            <CommitInput key={`c:${item.id}:${item.code}`} value={item.code} ltr onCommit={(code) => update({ code })} />
          </Field>
          <Field label="نوع هزینه">
            <Select size="sm" label="نوع هزینه" options={TYPE_OPTIONS} value={item.costType} onChange={(costType) => update({ costType })} />
          </Field>
        </div>

        {leaf ? (
          <>
            <Field asLabel={false} label="شیوهٔ قیمت" hint={item.hasPostedCost ? 'شیوهٔ قیمت قلم دارای هزینه عوض نمی‌شود.' : undefined}>
              <SegmentedControl
                fill
                activeKey={mode ?? ''}
                items={[
                  { key: 'unit_rate', label: 'نرخ واحد', disabled: Boolean(budgetLocked) || (item.hasPostedCost && mode !== 'unit_rate') },
                  { key: 'lump_sum', label: 'مقطوع', disabled: Boolean(budgetLocked) || (item.hasPostedCost && mode !== 'lump_sum') },
                ]}
                onChange={(key) => pricing({ pricing: key as PricingMode })}
                style={{ width: '100%' }}
              />
            </Field>

            {mode === 'unit_rate' && (
              <>
                <div className="grid c2" style={{ gap: 10 }}>
                  <Field label="واحد" error={undefined} hint={item.locks.unit ? undefined : undefined}>
                    <CommitInput
                      key={`u:${item.id}:${item.unit}`}
                      value={item.unit ?? ''}
                      list="cbs-units"
                      disabled={Boolean(item.locks.unit) || Boolean(budgetLocked)}
                      onCommit={(unit) => (item.change === 'added' || !item.unit ? pricing({ unit }) : update({ unit }))}
                    />
                  </Field>
                  <Field label="مقدار برآورد">
                    <CommitInput
                      key={`q:${item.id}:${item.estimatedQuantity}`}
                      value={item.estimatedQuantity == null ? '' : toFaDigits(String(item.estimatedQuantity)).replace('.', '٫')}
                      disabled={Boolean(budgetLocked)}
                      onCommit={(text) => {
                        const qty = parseNumber(text);
                        if (qty !== null && qty > 0) pricing({ qty });
                      }}
                    />
                  </Field>
                </div>
                {item.locks.unit && <Lock reason={item.locks.unit} />}
                {canViewAmounts && (
                  <Field label="نرخ واحد (ریال)">
                    <CommitInput
                      key={`r:${item.id}:${item.unitRate}`}
                      value={item.unitRate ?? ''}
                      ltr
                      disabled={Boolean(budgetLocked)}
                      onCommit={(text) => digits(text) && pricing({ rate: digits(text) })}
                    />
                  </Field>
                )}
              </>
            )}
            {mode === 'lump_sum' && canViewAmounts && (
              <Field label="مبلغ مقطوع (ریال)">
                <CommitInput
                  key={`l:${item.id}:${item.lumpSumAmount}`}
                  value={item.lumpSumAmount ?? ''}
                  ltr
                  disabled={Boolean(budgetLocked)}
                  onCommit={(text) => digits(text) && pricing({ lump: digits(text) })}
                />
              </Field>
            )}
            {!mode && <span className="hint err">شیوهٔ قیمت را انتخاب کنید؛ بدون آن نسخه اعمال نمی‌شود (V-08).</span>}
            {budgetLocked && (
              <span className="col g4">
                <Lock reason={budgetLocked} />
                {onRequestRevision && canViewAmounts && item.change !== 'added' && (
                  <button type="button" className="link t-12" style={{ alignSelf: 'flex-start' }} onClick={onRequestRevision}>
                    درخواست بازنگری بودجه
                  </button>
                )}
              </span>
            )}
            {budgetNeedsRevision && canReviseBudget && !budgetLocked && (
              <span className="hint row g4 ai-s">
                <Icon name="info" size={12} />
                تغییر نرخ، مقدار یا مبلغ این نسخه را «بازنگری بودجه» می‌کند (cbs.md ۷.۲). با تغییر نرخ، مقدار اتصال‌ها ثابت می‌ماند و زیربودجه‌شان به‌روز می‌شود.
              </span>
            )}

            <Field label="تأمین‌کننده یا توضیح">
              <CommitInput key={`s:${item.id}:${item.supplierNote}`} value={item.supplierNote ?? ''} onCommit={(supplier) => update({ supplier })} />
            </Field>

            {canViewAmounts && (
              <div className="box col g6" style={{ padding: '8px 10px' }}>
                <div className="row between t-12 tx7">
                  <span>بودجه (سرور)</span>
                  <Money value={item.budget} className="t-12 fw6 tx9" />
                </div>
                <div className="row between t-12 tx7">
                  <span>تخصیص‌یافته · {toFaDigits(item.linkCount)} اتصال</span>
                  <Money value={item.allocated} />
                </div>
                {BigInt(item.unallocated ?? '0') !== 0n && (
                  <div className={`row between t-12 ${BigInt(item.unallocated ?? '0') < 0n ? 'tx-err' : 'tx-wrn'}`}>
                    <span>{BigInt(item.unallocated ?? '0') < 0n ? 'تخصیص بیش از برآورد' : 'تخصیص‌نیافته'}</span>
                    <Money value={(BigInt(item.unallocated ?? '0') < 0n ? -BigInt(item.unallocated!) : BigInt(item.unallocated ?? '0')).toString()} className="t-12 fw6" />
                  </div>
                )}
                {item.hasPostedCost && (
                  <div className="row between t-12 tx7">
                    <span>هزینهٔ ثبت‌شده</span>
                    <Money value={item.postedAc} />
                  </div>
                )}
                {item.estimatedQuantity != null && item.unit && <span className="t-xs tx5">برآورد: {formatQuantity(item.estimatedQuantity, item.unit)}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="box col g4 t-12 tx7">
            <span>
              {toFaDigits(childCount)} زیرقلم · بودجه <Money value={item.budget} className="t-12 fw6 tx9" />
            </span>
            <span className="tx5">بودجهٔ گروه جمع زیرقلم‌هاست و جدا ویرایش نمی‌شود (cbs.md ۴.۳).</span>
          </div>
        )}

        {issues.length > 0 && (
          <div className="col g4">
            {issues.map((issue, index) => (
              <span key={index} className={`hint ${issue.severity === 'error' ? 'err' : ''} row g4 ai-s`}>
                <Icon name={issue.severity === 'error' ? 'alert-circle' : 'alert-triangle'} size={12} />
                {issue.message}
              </span>
            ))}
          </div>
        )}

        <div className="row wrap g6" style={{ marginTop: 4 }}>
          {leaf && item.locks.addChild ? (
            <AppButton variant="outline" size="sm" icon="split" onClick={onSplit} disabled={Boolean(budgetLocked)} title={budgetLocked ?? 'قلم دارای هزینه گروه نمی‌شود؛ با تقسیم زیر گروه تازه می‌رود (cbs.md ۴.۴)'}>
              تقسیم
            </AppButton>
          ) : (
            <AppButton variant="outline" size="sm" icon="plus-circle" onClick={onAddChild}>
              افزودن زیرقلم
            </AppButton>
          )}
          {leaf && !item.locks.close && (
            <AppButton variant="outline" size="sm" icon="lock" onClick={onClose} disabled={Boolean(budgetLocked)} title={budgetLocked}>
              بستن قلم
            </AppButton>
          )}
          <AppButton variant="dangerOutline" size="sm" icon="trash-2" onClick={onRemove} disabled={Boolean(item.locks.remove)} title={item.locks.remove}>
            {leaf ? 'حذف' : 'حذف گروه'}
          </AppButton>
        </div>
        {item.locks.remove && <Lock reason={item.locks.remove} />}
      </div>
      <datalist id="cbs-units">
        {COMMON_UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
    </div>
  );
}
