import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Menu } from '@/shared/components/ui/Menu';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { PlanDraftValidationDto } from '@/modules/plan/types';
import { describeOp, GENERATOR_LABELS } from '../../services/draftOps';
import type { DraftItemDto, OpError, WbsOp, WeightGenerator } from '../../types/draft';

export interface EditSidePaneProps {
  projectId: EntityId;
  validation: PlanDraftValidationDto | undefined;
  ops: WbsOp[];
  opErrors: OpError[];
  nameOf: (id: EntityId | null) => string;
  selected: DraftItemDto | null;
  structureLocked: boolean;
  canViewAmounts: boolean;
  onOp: (op: WbsOp) => void;
  onUndo: () => void;
  onShowItem: (id: EntityId) => void;
}

const GENERATORS: WeightGenerator[] = ['equal', 'duration', 'cost'];

/** پنل کناری W12 — اعتبارسنجی زنده، تغییرات نشست، مولد وزن و راهنمای کلیدها. */
export function EditSidePane({ projectId, validation, ops, opErrors, nameOf, selected, structureLocked, canViewAmounts, onOp, onUndo, onShowItem }: EditSidePaneProps) {
  const [showAll, setShowAll] = useState(false);
  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];
  const visibleErrors = showAll ? errors : errors.slice(0, 2);
  // گروهی که مولد رویش اجرا می‌شود: والد آیتم انتخاب‌شده، یا خودش اگر والد است
  const group = selected ? (selected.isLeaf ? selected.parentId : selected.id) : null;

  return (
    <>
      <Link className="row between solid-pri" to={ROUTES.wbs(projectId)} style={{ padding: '10px 12px', borderRadius: 8 }}>
        <span className="row g8">
          <Icon name="pencil" size={14} />
          <span className="col">
            <span className="t-13 fw5">حالت ویرایش</span>
            <span className="t-xs" style={{ opacity: 0.8 }}>
              برای بازگشت به درخت کلیک کنید
            </span>
          </span>
        </span>
        <span className="sw on" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.25)' }} />
      </Link>

      {opErrors.map((error) => (
        <Alert key={error.index} tone="err" icon="x-circle">
          <div className="col g4">
            <strong>این تغییر انجام نشد</strong>
            <span className="t-12">{error.message}</span>
            {error.index === ops.length - 1 && (
              <button type="button" className="link t-12" style={{ alignSelf: 'flex-start', color: '#B91C1C' }} onClick={onUndo}>
                واگرد همین تغییر
              </button>
            )}
          </div>
        </Alert>
      ))}

      {errors.length > 0 ? (
        <div className="col g6" aria-live="polite">
          {visibleErrors.map((issue, index) => (
            <div key={index} className="alert err">
              <span style={{ display: 'inline-flex', marginTop: 2 }}>
                <Icon name="alert-octagon" size={15} />
              </span>
              <div className="col g4">
                <span className="t-12">{issue.message}</span>
                <span className="row wrap g8">
                  {issue.code === 'weight_sum' && (
                    <button type="button" className="link t-12" style={{ color: '#B91C1C' }} onClick={() => onOp({ type: 'autoDistribute', parentId: issue.parentId ?? null })}>
                      پخش خودکار بین فرزندان
                    </button>
                  )}
                  {issue.wbsItemId && (
                    <button type="button" className="link t-12" style={{ color: '#B91C1C' }} onClick={() => onShowItem(issue.wbsItemId!)}>
                      نمایش
                    </button>
                  )}
                </span>
              </div>
            </div>
          ))}
          {errors.length > 2 && (
            <button type="button" className="link t-12" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'کمتر' : `همهٔ ${toFaDigits(errors.length)} خطا`}
            </button>
          )}
          <span className="t-xs tx5">ذخیره ممکن است؛ تا رفع این‌ها نسخه اعمال نمی‌شود.</span>
        </div>
      ) : (
        validation && (
          <Alert tone="ok" icon="check-circle-2">
            خطای مانع اعمال ندارد{warnings.length > 0 ? ` · ${toFaDigits(warnings.length)} هشدار` : ''}.
          </Alert>
        )
      )}

      <div className="col g8">
        <span className="sect-t">وزن‌ها</span>
        <div className="row wrap g6">
          <AppButton size="sm" variant="outline" icon="sliders-horizontal" disabled={!selected} onClick={() => onOp({ type: 'autoDistribute', parentId: group })} title="اختلاف جمع با ۱۰۰ را به نسبت وزن‌های فعلی پخش می‌کند">
            پخش خودکار
          </AppButton>
          <Menu
            width={250}
            entries={[
              { key: 'g1', group: selected ? `گروه «${nameOf(group)}»` : 'سطح اول' },
              ...GENERATORS.filter((generator) => generator !== 'cost' || canViewAmounts).map((generator) => ({
                key: `group-${generator}`,
                label: GENERATOR_LABELS[generator],
                onSelect: () => onOp({ type: 'generateWeights', scope: group, generator }),
              })),
              { key: 'sep', separator: true },
              { key: 'g2', group: 'کل درخت' },
              ...GENERATORS.filter((generator) => generator !== 'cost' || canViewAmounts).map((generator) => ({
                key: `tree-${generator}`,
                label: GENERATOR_LABELS[generator],
                tone: 'warn' as const,
                note: 'همهٔ وزن‌های دستی بازنویسی می‌شود',
                onSelect: () => onOp({ type: 'generateWeights', scope: 'tree', generator }),
              })),
            ]}
            trigger={(props) => (
              <AppButton {...props} size="sm" variant="ghost" icon="chevron-down">
                مولد وزن
              </AppButton>
            )}
          />
        </div>
        <span className="t-xs tx5">مولد فقط وزن نسخهٔ کاری را می‌نویسد (D04)؛ برگ زمانی در «از هزینه» صفر می‌گیرد.</span>
      </div>

      <div className="col g8">
        <span className="sect-t row between">
          تغییرات ذخیره‌نشده
          {ops.length > 0 && (
            <Badge size="sm" tone="wrn">
              {toFaDigits(ops.length)}
            </Badge>
          )}
        </span>
        {ops.length === 0 ? (
          <span className="t-12 tx5">هنوز تغییری نداده‌اید.</span>
        ) : (
          <div className="box col g8" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {ops
              .map((op, index) => ({ op, index, view: describeOp(op, nameOf) }))
              .reverse()
              .map(({ index, view }) => (
                <div key={index} className="row g8 t-12 ai-s">
                  <IconBox icon={view.icon} tone={view.tone} size="sm" />
                  <span className={`grow ${opErrors.some((error) => error.index === index) ? 'tx-err' : 'tx8'}`}>{view.text}</span>
                </div>
              ))}
          </div>
        )}
        <AppButton variant="ghost" size="sm" icon="undo-2" disabled={ops.length === 0} onClick={onUndo} style={{ justifyContent: 'flex-start' }}>
          واگرد آخرین تغییر
          <Kbd className="ms-auto">Ctrl+Z</Kbd>
        </AppButton>
      </div>

      <div className="col g6">
        <span className="sect-t">راهنمای ویرایش</span>
        {structureLocked ? (
          <span className="t-12 tx6">ساختار و تاریخ‌ها مال MSP است؛ اینجا وزن، روش، گام‌ها، عنوان، کد، واحد و مقدار ویرایش می‌شود.</span>
        ) : (
          <>
            <span className="row g6 t-12 tx6">
              <Icon name="grip-vertical" size={13} />
              با دستگیره ردیف را جابه‌جا کنید
            </span>
            <span className="row g6 t-12 tx6">
              <Kbd>Tab</Kbd>تورفتگی (فرزندِ ردیف بالا)
            </span>
            <span className="row g6 t-12 tx6">
              <Kbd>Shift+Tab</Kbd>برگرداندن تورفتگی
            </span>
            <span className="row g6 t-12 tx6">
              <Kbd>Enter</Kbd>افزودن آیتم هم‌سطح
            </span>
            <span className="row g6 t-12 tx6">
              <Kbd>Alt+↑</Kbd>
              <Kbd>Alt+↓</Kbd>جابه‌جایی میان هم‌سطح‌ها
            </span>
          </>
        )}
      </div>
    </>
  );
}
