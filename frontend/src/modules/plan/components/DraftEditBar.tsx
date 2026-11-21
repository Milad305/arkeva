import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Icon } from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { toFaDigits } from '@/shared/utils/num';

export interface DraftEditBarProps {
  /** «حالت ویرایش CBS — بازنگری کاری R5». */
  title: string;
  syncsToCurrent: boolean;
  hasDraft: boolean;
  dirtyCount: number;
  isPreviewing: boolean;
  backTo: string;
  backLabel: string;
  onSave: () => void;
  isSaving: boolean;
  /** دلیل غیرفعال بودن «ذخیره» (مثلاً عملی که سرور نپذیرفت). */
  saveBlockedReason?: string;
  showApply: boolean;
  applyDisabledReason?: string;
  onApply: () => void;
}

/**
 * نوار نارنجی حالت ویرایش نسخهٔ کاری (بوم W12) — مشترک W12، حالت ویرایش CBS و W15:
 * نام نسخه، اثر ذخیره، شمار تغییر ذخیره‌نشده، ذخیره و «اعمال…».
 */
export function DraftEditBar({
  title,
  syncsToCurrent,
  hasDraft,
  dirtyCount,
  isPreviewing,
  backTo,
  backLabel,
  onSave,
  isSaving,
  saveBlockedReason,
  showApply,
  applyDisabledReason,
  onApply,
}: DraftEditBarProps) {
  const dirty = dirtyCount > 0;
  return (
    <div className="row wrap g8 wrn" style={{ padding: '9px 16px', borderBottom: '1px solid rgba(217,119,6,0.28)', fontSize: 12.5 }}>
      <Icon name="pencil" size={14} />
      <span>
        <strong>{title}.</strong>{' '}
        {syncsToCurrent
          ? 'ذخیره بلافاصله در برنامهٔ پروژه دیده می‌شود؛ با فعال‌سازی، مبنا ثبت و قفل می‌شود.'
          : hasDraft
            ? 'ذخیره فقط نسخهٔ کاری را عوض می‌کند؛ برنامهٔ جاری تا «اعمال» دست نمی‌خورد.'
            : 'با اولین ذخیره، نسخهٔ کاری از برنامهٔ جاری ساخته می‌شود.'}
      </span>
      <span className="row g6 ms-auto">
        {isPreviewing && (
          <span className="row g4 tx6" role="status">
            <Spinner size={12} />
            محاسبه…
          </span>
        )}
        {dirty ? (
          <span className="row g6">
            <span className="dot" style={{ color: '#E07A2C' }} />
            <span className="tx7">{toFaDigits(dirtyCount)} تغییر ذخیره‌نشده</span>
          </span>
        ) : (
          <span className="tx7">همه ذخیره شده</span>
        )}
        <LinkButton to={backTo} variant="ghost" size="sm">
          {dirty ? 'انصراف' : backLabel}
        </LinkButton>
        <AppButton variant="primary" size="sm" icon="check" disabled={!dirty || Boolean(saveBlockedReason)} title={saveBlockedReason} loading={isSaving} onClick={onSave}>
          ذخیرهٔ تغییرات
        </AppButton>
        {showApply && (
          <AppButton variant="success" size="sm" icon="git-branch" disabled={Boolean(applyDisabledReason)} title={applyDisabledReason} onClick={onApply}>
            اعمال…
          </AppButton>
        )}
      </span>
    </div>
  );
}
