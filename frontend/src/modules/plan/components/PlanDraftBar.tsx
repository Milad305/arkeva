import { useState } from 'react';

import { ROUTES } from '@/config/routes';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Icon } from '@/shared/components/ui/Icon';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { versionLabel } from '@/modules/projects/services/planVersion';
import { useDiscardPlanDraftMutation } from '../api/planApi';

/**
 * نوار وضعیت نسخهٔ کاری بالای W11 و W12 (`features/plan-versions.md` ۹، شکاف G3):
 * «بازنگری کاری R4 · ۱۲ تغییر · آخرین ذخیره: مهندس احمدی، ۱۰ دقیقه پیش».
 *
 * فقط برای بازنگری کاری پروژهٔ فعال یا متوقف؛ مبنای کاری پروژهٔ پیش‌نویس با هر ذخیره
 * با جدول جاری همگام است (F04 ۳) و نوار جدا نمی‌خواهد.
 *
 * «اعمال» به حالت ویرایش می‌برد؛ دیالوگ اعمال با اعتبارسنجی و خلاصهٔ اثر (۵.۱، ۵.۲)
 * همراه W12 ساخته می‌شود (تصمیم 1405/08/15).
 */
/** `editPath`: حالت ویرایشی که «ادامهٔ ویرایش» به آن می‌رود — W12 یا حالت ویرایش CBS. */
export function PlanDraftBar({ project, editPath }: { project: ProjectDetailDto; editPath?: string }) {
  const editTo = editPath ?? ROUTES.wbsEdit(project.id);
  const canView = useHasPermission('plan.view_versions');
  const canEdit = useHasPermission('plan.edit_draft');
  const canApply = useHasPermission('plan.apply');
  const canDiscard = useHasPermission('plan.discard');
  const [isConfirming, setIsConfirming] = useState(false);
  const [discard, discardState] = useDiscardPlanDraftMutation();

  const draft = project.plan.draft;
  const isLive = project.status === 'active' || project.status === 'paused';
  if (!draft || draft.kind !== 'revision' || !isLive || !(canView || canEdit)) return null;

  // شمارهٔ نسخه مثل سربرگ لاتین می‌ماند («R3»)؛ کدها لاتین‌اند (CLAUDE.md ۵)
  const name = `بازنگری کاری R${draft.number}`;
  const current = project.plan.current;

  async function confirmDiscard() {
    try {
      await discard(project.id).unwrap();
      setIsConfirming(false);
    } catch {
      // پیام خطا را میان‌افزار سراسری نشان می‌دهد؛ دیالوگ باز می‌ماند
    }
  }

  return (
    <>
      <div
        className="row wrap g8 wrn"
        role="status"
        style={{ padding: '9px 16px', borderBottom: '1px solid rgba(217,119,6,0.28)', fontSize: 12.5 }}
      >
        <Icon name="git-branch" size={14} />
        <span>
          <strong>{name}</strong>
          {' · '}
          {toFaDigits(draft.changeCount)} تغییر
          {draft.lastSavedAt && (
            <>
              {' · '}آخرین ذخیره: {draft.lastSavedBy?.fullName ?? '—'}، {formatRelativeTime(draft.lastSavedAt)}
            </>
          )}
          <span className="tx7"> — هنوز اعمال نشده؛ درخت زیر برنامهٔ جاری{current ? ` (${versionLabel(current)})` : ''} است.</span>
        </span>
        <span className="row g6 ms-auto">
          {canDiscard && (
            <AppButton variant="ghost" size="sm" icon="trash-2" onClick={() => setIsConfirming(true)}>
              کنار گذاشتن
            </AppButton>
          )}
          {canApply && (
            <LinkButton to={`${editTo}?apply=1`} variant="outline" size="sm" icon="check">
              اعمال
            </LinkButton>
          )}
          {canEdit && (
            <LinkButton to={editTo} variant="primary" size="sm" icon="pencil">
              ادامهٔ ویرایش
            </LinkButton>
          )}
        </span>
      </div>

      <ConfirmDialog
        isOpen={isConfirming}
        onCancel={() => setIsConfirming(false)}
        onConfirm={() => void confirmDiscard()}
        loading={discardState.isLoading}
        tone="danger"
        icon="trash-2"
        title={`کنار گذاشتن «${name}»`}
        description={`${toFaDigits(draft.changeCount)} تغییر این نسخه کنار گذاشته می‌شود و برنامهٔ جاری${
          current ? ` (${versionLabel(current)})` : ''
        } همان‌طور می‌ماند. نسخهٔ کنارگذاشته برای ممیزی نگه داشته می‌شود ولی در فهرست نسخه‌ها دیده نمی‌شود.`}
        confirmLabel="کنار گذاشتن نسخهٔ کاری"
        confirmIcon="trash-2"
      />
    </>
  );
}
