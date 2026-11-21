import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LEAF_MEASUREMENT_METHODS, type LeafMeasurementMethod } from '@/config/constants';
import { WBS_DEEP_LINKS } from '@/config/routes';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, jalaliToIso } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { CommitInput, Field, Lock } from '@/modules/plan/components/EditFields';
import { parseNumber } from '@/modules/plan/services/parseNumber';
import type { PlanValidationIssue } from '@/modules/plan/types';
import type { DraftFields, DraftItemDto, WbsOp } from '../../types/draft';

const METHODS: LeafMeasurementMethod[] = ['percent', 'quantity', 'steps', 'time_based'];
const COMMON_UNITS = ['مترمکعب', 'مترمربع', 'متر', 'تن', 'عدد', 'کیلومتر', 'دستگاه'];

export interface WbsItemFormProps {
  projectId: EntityId;
  item: DraftItemDto;
  /** مشکلات اعتبارسنجی همین آیتم و گروهش. */
  issues: PlanValidationIssue[];
  /** مشکل V-01 گروهی که این آیتم در آن است. */
  groupIssue: PlanValidationIssue | undefined;
  childCount: number;
  canAssign: boolean;
  onOp: (op: WbsOp) => void;
  onSplit: () => void;
  onRemove: () => void;
  onAddChild: () => void;
}

/**
 * پنل «ویرایش آیتم» W12 — همهٔ فیلدهای wbs.md ۴. فیلدی که قاعده‌ای از ۵.۶ یا مالکیت
 * MSP (۹) قفلش کرده غیرفعال است و دلیل و راه جایگزین کنارش می‌آید (wbs.md ۸).
 * هر فیلد با ترک آن یک عمل `update` می‌سازد.
 */
export function WbsItemForm({ projectId, item, issues, groupIssue, childCount, canAssign, onOp, onSplit, onRemove, onAddChild }: WbsItemFormProps) {
  const update = (fields: Partial<DraftFields>) => onOp({ type: 'update', id: item.id, fields });
  const leaf = item.isLeaf;
  const suggestion = groupIssue?.suggestions?.[item.id];
  // جمع وزن گروه کنار فیلد وزن، و خطای گام‌ها درون ویرایشگر گام‌ها نشان داده می‌شود
  const showsSteps = leaf && item.measurementMethod === 'steps';
  const generalIssues = issues.filter(
    (issue) => issue.code !== 'weight_sum' && !(showsSteps && (issue.code === 'steps_invalid' || issue.code === 'steps_conversion')),
  );

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      <div className="pane-h col g4">
        <span className="row g6">
          <Badge tone="neu" mono icon={leaf ? 'file-text' : 'folder'}>
            <span dir="ltr">{item.code}</span>
          </Badge>
          {item.change === 'added' && <Badge tone="ok">جدید</Badge>}
          {item.hasReports && (
            <Badge tone="inf" icon="clipboard-check">
              گزارش دارد
            </Badge>
          )}
        </span>
        <h2 className="h-t3">ویرایش آیتم</h2>
      </div>

      <div className="col g12" style={{ padding: '14px 16px' }}>
        <Field label="عنوان">
          <CommitInput key={`t:${item.id}:${item.title}`} value={item.title} onCommit={(title) => update({ title })} />
        </Field>

        <div className="grid c2" style={{ gap: 10 }}>
          <Field label="کد" hint={item.codeMode === 'custom' ? 'دستی — با جابه‌جایی عوض نمی‌شود' : 'خودکار از جایگاه'}>
            <CommitInput key={`c:${item.id}:${item.code}`} value={item.code} ltr onCommit={(code) => update({ code })} />
          </Field>
          <Field label="وزن در والد" error={groupIssue ? groupIssue.message : undefined}>
            <CommitInput
              key={`w:${item.id}:${item.weightInParent}`}
              value={toFaDigits(String(item.weightInParent)).replace('.', '٫')}
              suffix="٪"
              invalid={Boolean(groupIssue)}
              onCommit={(text) => {
                const value = parseNumber(text);
                if (value !== null && value >= 0 && value <= 100) update({ weightInParent: Math.round(value * 100) / 100 });
              }}
            />
          </Field>
        </div>
        {groupIssue && (
          <div className="row wrap g8 t-12">
            {suggestion !== undefined && (
              <button type="button" className="link" onClick={() => update({ weightInParent: suggestion })}>
                این مقدار را {formatPercentAuto(suggestion, 2)} کنید
              </button>
            )}
            <button type="button" className="link" onClick={() => onOp({ type: 'autoDistribute', parentId: item.parentId })}>
              پخش خودکار بین هم‌سطح‌ها
            </button>
          </div>
        )}

        {leaf ? (
          <LeafFields item={item} update={update} />
        ) : (
          <div className="box col g6 t-12 tx7">
            <span>
              {toFaDigits(childCount)} فرزند · {formatJalaliDate(item.plannedStart)} تا {formatJalaliDate(item.plannedFinish)}
            </span>
            <span className="tx5">تاریخ‌های والد از فرزندان ساخته می‌شود و جدا ویرایش نمی‌شود (wbs.md ۵.۴).</span>
            <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => onOp({ type: 'autoDistribute', parentId: item.id })}>
              پخش خودکار وزن فرزندان
            </button>
          </div>
        )}

        {leaf && item.measurementMethod === 'steps' && (
          <StepsEditor key={`${item.id}:${JSON.stringify(item.steps)}`} item={item} issues={issues} onOp={onOp} />
        )}

        {leaf && item.measurementMethod !== 'time_based' && !item.isMilestone && (
          <Field asLabel={false} label="سرپرست مسئول" hint="عملیاتی و بدون نسخه — از صفحهٔ تخصیص (W17) عوض می‌شود">
            <span className="row between">
              {item.supervisor ? (
                <span className="row g6 t-13">
                  <Avatar size="s" name={item.supervisor.fullName} tone={item.supervisor.avatarTone} />
                  {item.supervisor.fullName}
                </span>
              ) : (
                <span className="t-13 tx-wrn">تخصیص‌نیافته</span>
              )}
              {canAssign && item.change !== 'added' && (
                <Link className="link t-12" to={WBS_DEEP_LINKS.assignment(projectId, item.id)}>
                  {item.supervisor ? 'تغییر' : 'تخصیص'}
                </Link>
              )}
            </span>
          </Field>
        )}

        {generalIssues.length > 0 && (
          <div className="col g4">
            {generalIssues
              .map((issue, index) => (
                <span key={index} className={`hint ${issue.severity === 'error' ? 'err' : ''} row g4 ai-s`}>
                  <Icon name={issue.severity === 'error' ? 'alert-circle' : 'alert-triangle'} size={12} />
                  {issue.message}
                </span>
              ))}
          </div>
        )}

        <div className="row wrap g6" style={{ marginTop: 4 }}>
          {!item.locks.structure && (
            <>
              {leaf && item.hasReports ? (
                <AppButton variant="outline" size="sm" icon="split" onClick={onSplit} title="برگ دارای گزارش والد نمی‌شود؛ با تقسیم، شاخه‌اش می‌کنید (wbs.md ۵.۶)">
                  تقسیم
                </AppButton>
              ) : (
                <AppButton variant="outline" size="sm" icon="plus-circle" onClick={onAddChild}>
                  افزودن فرزند
                </AppButton>
              )}
              <AppButton variant="dangerOutline" size="sm" icon="trash-2" onClick={onRemove}>
                {leaf ? 'حذف' : 'حذف شاخه'}
              </AppButton>
            </>
          )}
        </div>
        {item.locks.structure && <Lock reason={item.locks.structure} />}
      </div>
    </div>
  );
}

function LeafFields({ item, update }: { item: DraftItemDto; update: (fields: Partial<DraftFields>) => void }) {
  const method = item.measurementMethod ?? 'percent';
  const lockedDates = item.locks.plannedStart;

  return (
    <>
      <Checkbox
        checked={item.isMilestone}
        onChange={(event) => update({ isMilestone: event.target.checked })}
        label="نقطهٔ عطف (مدت صفر، فقط ۰ یا ۱۰۰٪)"
      />

      {!item.isMilestone && (
        <Field asLabel={false} label="روش اندازه‌گیری پیشرفت" hint={item.hasApprovedProgress ? 'تغییر روش برگ دارای پیشرفت، هنگام اعمال یک «آیتم تبدیل» می‌سازد (wbs.md ۵.۶).' : undefined}>
          <SegmentedControl
            emphasis
            fill
            activeKey={method}
            onChange={(key) => update({ measurementMethod: key as LeafMeasurementMethod })}
            items={METHODS.map((key) => ({ key, label: LEAF_MEASUREMENT_METHODS[key].replace('گام‌های وزنی', 'گام‌ها').replace('پیشرفت زمانی', 'زمانی') }))}
          />
        </Field>
      )}

      {(method === 'quantity' || method === 'percent') && !item.isMilestone && (
        <div className="grid c2" style={{ gap: 10 }}>
          <Field label={method === 'quantity' ? 'مقدار کل' : 'مقدار کل (اطلاعاتی)'} hint={item.approvedQuantity !== null ? `تأییدشده: ${toFaDigits(item.approvedQuantity)}` : undefined}>
            <CommitInput
              key={`q:${item.id}:${item.totalQuantity}`}
              value={item.totalQuantity === null ? '' : toFaDigits(String(item.totalQuantity))}
              onCommit={(text) => {
                const value = text.trim() === '' ? null : parseNumber(text);
                if (value === null || value > 0) update({ totalQuantity: value });
              }}
            />
          </Field>
          <Field label="واحد">
            <CommitInput
              key={`u:${item.id}:${item.unit}`}
              value={item.unit ?? ''}
              list="wbs-units"
              disabled={Boolean(item.locks.unit)}
              onCommit={(unit) => update({ unit: unit.trim() || null })}
            />
            <datalist id="wbs-units">
              {COMMON_UNITS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
          </Field>
        </div>
      )}
      {item.locks.unit && <Lock reason={item.locks.unit} />}

      <div className="grid c2" style={{ gap: 10 }}>
        <Field label={item.isMilestone ? 'تاریخ' : 'شروع برنامه‌ای'}>
          <DateInput key={`s:${item.id}:${item.plannedStart}`} value={item.plannedStart} disabled={Boolean(lockedDates)} onCommit={(date) => update({ plannedStart: date })} />
        </Field>
        {!item.isMilestone && (
          <Field label="پایان برنامه‌ای">
            <DateInput key={`f:${item.id}:${item.plannedFinish}`} value={item.plannedFinish} disabled={Boolean(lockedDates)} onCommit={(date) => update({ plannedFinish: date })} />
          </Field>
        )}
      </div>
      {lockedDates && <Lock reason={lockedDates} />}
      {method === 'time_based' && (
        <span className="hint">پیشرفت زمانی: سرپرست و گزارش کارگاه ندارد و وزن پیش‌فرضش صفر است (D03-الف).</span>
      )}
    </>
  );
}

// ── ویرایشگر گام‌ها (G12، wbs.md ۴.۲ و ۵.۶) ──

function StepsEditor({ item, issues, onOp }: { item: DraftItemDto; issues: PlanValidationIssue[]; onOp: (op: WbsOp) => void }) {
  const initial = (item.steps ?? []).map((step) => ({ ...step, done: item.stepsDone?.[step.key] }));
  const [steps, setSteps] = useState(initial.length > 0 ? initial : [{ key: newStepKey(), title: '', weight: 0, done: undefined as number | undefined }]);
  // برگ دارای پیشرفت که تازه به گام‌ها تبدیل می‌شود درصد فعلی هر گام را می‌خواهد (V-05)
  const needsDone = item.hasApprovedProgress && issues.some((issue) => issue.code === 'steps_conversion');
  const stepIssues = issues.filter((issue) => issue.code === 'steps_invalid' || issue.code === 'steps_conversion');
  const dirty = JSON.stringify(steps) !== JSON.stringify(initial);

  const set = (index: number, patch: Partial<(typeof steps)[number]>) =>
    setSteps((previous) => previous.map((step, i) => (i === index ? { ...step, ...patch } : step)));

  return (
    <div className="box col g8">
      <span className="t-13 fw6 row g6">
        <Icon name="list-checks" size={14} />
        گام‌ها
        <span className="t-xs tx5 fw5">۲ تا ۱۰ گام · جمع وزن ۱۰۰</span>
      </span>
      {steps.map((step, index) => {
        const locked = item.hasApprovedProgress && (item.stepsDone?.[step.key] ?? 0) > 0;
        return (
          <div key={step.key} className="row g6">
            <TextInput size="sm" value={step.title} placeholder="عنوان گام" aria-label={`عنوان گام ${toFaDigits(index + 1)}`} onChange={(event) => set(index, { title: event.target.value })} style={{ flex: '1 1 auto' }} />
            <TextInput
              size="sm"
              value={step.weight ? toFaDigits(String(step.weight)) : ''}
              suffix="٪"
              inputMode="decimal"
              aria-label={`وزن گام ${toFaDigits(index + 1)}`}
              onChange={(event) => set(index, { weight: parseNumber(event.target.value) ?? 0 })}
              style={{ width: 76 }}
            />
            {needsDone && (
              <TextInput
                size="sm"
                value={step.done === undefined ? '' : toFaDigits(String(step.done))}
                placeholder="انجام"
                suffix="٪"
                aria-label={`درصد انجام فعلی گام ${toFaDigits(index + 1)}`}
                onChange={(event) => set(index, { done: parseNumber(event.target.value) ?? undefined })}
                style={{ width: 76 }}
              />
            )}
            <button
              type="button"
              className="ibtn sm"
              aria-label={`حذف گام ${toFaDigits(index + 1)}`}
              disabled={locked || steps.length <= 1}
              title={locked ? 'این گام پیشرفت تأییدشده دارد و حذف نمی‌شود؛ نامش یا وزنش را عوض کنید.' : undefined}
              onClick={() => setSteps((previous) => previous.filter((_, i) => i !== index))}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        );
      })}
      <div className="row between">
        <button
          type="button"
          className="link t-12 row g4"
          disabled={steps.length >= 10}
          onClick={() => setSteps((previous) => [...previous, { key: newStepKey(), title: '', weight: 0, done: undefined }])}
        >
          <Icon name="plus" size={12} />
          افزودن گام
        </button>
        <AppButton
          size="xs"
          variant="primary"
          disabled={!dirty}
          onClick={() =>
            onOp({
              type: 'setSteps',
              id: item.id,
              steps: steps.map(({ key, title, weight }) => ({ key, title: title.trim(), weight })),
              stepsDone: needsDone
                ? Object.fromEntries(steps.filter((step) => step.done !== undefined).map((step) => [step.key, step.done!]))
                : undefined,
            })
          }
        >
          ثبت گام‌ها
        </AppButton>
      </div>
      {stepIssues.map((issue, index) => (
        <span key={index} className="hint err row g4 ai-s">
          <Icon name="alert-circle" size={12} />
          {issue.message}
        </span>
      ))}
    </div>
  );
}

/** کلید پایدار گام — هرگز دوباره استفاده نمی‌شود (wbs.md ۴.۲). */
function newStepKey(): string {
  return `s-${crypto.randomUUID().slice(0, 6)}`;
}

// ── اجزای کوچک فرم ──

/** تاریخ شمسی «۱۴۰۴/۰۱/۲۲» ← ISO؛ خطای قالب درجا گفته می‌شود. */
function DateInput({ value, onCommit, disabled }: { value: string; onCommit: (date: string | null) => void; disabled?: boolean }) {
  const initial = value ? formatJalaliDate(value) : '';
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <TextInput
        size="sm"
        icon="calendar"
        value={text}
        placeholder="۱۴۰۴/۰۱/۲۲"
        disabled={disabled}
        invalid={Boolean(error)}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        onBlur={() => {
          if (text === initial) return;
          if (text.trim() === '') return onCommit(null);
          const iso = jalaliToIso(text);
          if (!iso) return setError('تاریخ را به شکل ۱۴۰۴/۰۱/۲۲ بنویسید.');
          onCommit(iso);
        }}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
      />
      {error && <span className="hint err">{error}</span>}
    </>
  );
}

