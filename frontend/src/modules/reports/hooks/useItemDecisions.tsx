import { useState, type ReactNode } from 'react';

import { toast } from '@/shared/components/feedback/toastStore';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { getApiError, getApiErrorMessage } from '@/shared/utils/apiError';
import type { EntityId } from '@/shared/types/api';
import { useDecideItemMutation } from '../api/fieldReportsApi';
import { DecisionDialog, type DecisionMode } from '../components/DecisionDialog';
import { CorrectItemDialog, NoteActionDialog } from '../components/ItemActionDialogs';
import type { FieldItemDto } from '../types';

export type ItemDialogKind = DecisionMode | 'correct' | 'revoke' | 'resolve';

/**
 * همهٔ تصمیم‌های یک آیتم در یک جا — W20 و W40 از همین استفاده می‌کنند تا رفتار تأیید،
 * تأیید «فراتر از مقدار کل» (۹.۳) و دیالوگ‌ها یکی باشد.
 */
export function useItemDecisions(projectId: EntityId | null, onDecided?: (item: FieldItemDto) => void) {
  const [decide, decideState] = useDecideItemMutation();
  const [dialog, setDialog] = useState<{ kind: ItemDialogKind; item: FieldItemDto; projectId: EntityId } | null>(null);
  const [overTotal, setOverTotal] = useState<FieldItemDto | null>(null);
  const [busyId, setBusyId] = useState<EntityId | null>(null);

  async function approve(item: FieldItemDto, confirmOverTotal = false) {
    setBusyId(item.id);
    try {
      const result = await decide({ projectId: projectId ?? item.projectId, itemId: item.id, decision: 'approve', confirmOverTotal }).unwrap();
      if (result.message) toast.info(result.message);
      else toast.success(`${item.wbsCode} تأیید شد.`);
      onDecided?.(item);
    } catch (cause) {
      if (getApiError(cause)?.details?.requiresConfirm === 'over_total_quantity') setOverTotal(item);
      else toast.error(getApiErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  const open = (kind: ItemDialogKind, item: FieldItemDto) => setDialog({ kind, item, projectId: projectId ?? item.projectId });
  const close = () => setDialog(null);
  const done = (message: string | null) => {
    const item = dialog?.item;
    setDialog(null);
    if (message) toast.success(message);
    else if (dialog?.kind === 'reject') toast.success('آیتم رد شد و به سرپرست اعلان رفت.');
    else if (dialog?.kind === 'request_revision') toast.success('درخواست اصلاح برای سرپرست فرستاده شد.');
    if (item) onDecided?.(item);
  };

  let element: ReactNode = null;
  if (dialog) {
    const { kind, item } = dialog;
    if (kind === 'request_revision' || kind === 'reject') element = <DecisionDialog projectId={dialog.projectId} mode={kind} item={item} onClose={close} onDone={done} />;
    else if (kind === 'correct') element = <CorrectItemDialog projectId={dialog.projectId} item={item} onClose={close} onDone={done} />;
    else if (kind === 'revoke' || kind === 'resolve') element = <NoteActionDialog projectId={dialog.projectId} item={item} kind={kind} onClose={close} onDone={done} />;
  }

  const confirm = (
    <ConfirmDialog
      isOpen={overTotal !== null}
      tone="warning"
      icon="alert-triangle"
      title="تأیید فراتر از مقدار کل"
      description="مقدار تجمعی این برگ با این آیتم از مقدار کل بیشتر می‌شود. درصد برگ روی ۱۰۰ می‌ماند. تأیید شود؟"
      confirmLabel="تأیید با همین مقدار"
      onCancel={() => setOverTotal(null)}
      onConfirm={() => {
        const item = overTotal;
        setOverTotal(null);
        if (item) void approve(item, true);
      }}
    />
  );

  return {
    approve: (item: FieldItemDto) => void approve(item),
    open,
    busyId: decideState.isLoading ? busyId : null,
    dialogOpen: dialog !== null || overTotal !== null,
    element: (
      <>
        {element}
        {confirm}
      </>
    ),
  };
}
