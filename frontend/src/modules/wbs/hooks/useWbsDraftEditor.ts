import { useCallback, useEffect, useRef, useState } from 'react';

import type { EntityId } from '@/shared/types/api';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { useGetWbsDraftQuery, usePreviewWbsOpsMutation, useSaveWbsOpsMutation } from '../api/wbsDraftApi';
import { pushOp } from '../services/draftOps';
import type { DraftTreeDto, OpError, WbsOp } from '../types/draft';

/** فاصلهٔ آرام شدن تایپ پیش از پیش‌نمایش. */
const PREVIEW_DELAY_MS = 220;

export interface WbsDraftEditor {
  /** آنچه نمایش داده می‌شود: پیش‌نمایش اگر تغییری هست، وگرنه نسخهٔ کاری ذخیره‌شده. */
  view: DraftTreeDto | undefined;
  base: DraftTreeDto | undefined;
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
  ops: WbsOp[];
  opErrors: OpError[];
  isPreviewing: boolean;
  /** پیام ۴۰۹ — کس دیگری نسخهٔ کاری را ذخیره کرده است. */
  conflict: string | null;
  apply: (op: WbsOp) => void;
  undo: () => void;
  discardLocal: () => void;
  save: () => Promise<Record<EntityId, EntityId> | null>;
  isSaving: boolean;
}

/**
 * حالت ویرایش W12: فهرست عملیات در مرورگر (wbs.md ۸)، پیش‌نمایش در سرور
 * (تصمیم 1405/08/15)، ذخیره با `draftRevision`. واگرد = برداشتن آخرین عمل.
 */
export function useWbsDraftEditor(projectId: EntityId): WbsDraftEditor {
  const draft = useGetWbsDraftQuery(projectId);
  const [preview] = usePreviewWbsOpsMutation();
  const [saveOps, saveState] = useSaveWbsOpsMutation();

  const [ops, setOps] = useState<WbsOp[]>([]);
  const [result, setResult] = useState<{ ops: WbsOp[]; view: DraftTreeDto; errors: OpError[] } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const requestRef = useRef(0);

  const base = draft.data;

  useEffect(() => {
    if (!base || ops.length === 0) {
      setResult(null);
      setIsPreviewing(false);
      return undefined;
    }
    const request = ++requestRef.current;
    setIsPreviewing(true);
    const timer = window.setTimeout(() => {
      preview({ projectId, draftRevision: base.draftRevision, ops })
        .unwrap()
        .then((response) => {
          if (request !== requestRef.current) return;
          setResult({ ops, view: response, errors: response.opErrors });
          setConflict(null);
        })
        .catch((cause: unknown) => {
          if (request !== requestRef.current) return;
          if (typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 409) {
            setConflict(getApiErrorMessage(cause));
          }
        })
        .finally(() => {
          if (request === requestRef.current) setIsPreviewing(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [base, ops, preview, projectId]);

  const apply = useCallback((op: WbsOp) => setOps((previous) => pushOp(previous, op)), []);
  const undo = useCallback(() => setOps((previous) => previous.slice(0, -1)), []);
  const discardLocal = useCallback(() => setOps([]), []);

  const save = useCallback(async () => {
    if (!base || ops.length === 0) return null;
    try {
      const response = await saveOps({ projectId, draftRevision: base.draftRevision, ops }).unwrap();
      setOps([]);
      setResult(null);
      setConflict(null);
      return response.idMap;
    } catch (cause) {
      if (typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 409) {
        setConflict(getApiErrorMessage(cause));
      }
      return null;
    }
  }, [base, ops, projectId, saveOps]);

  const reload = useCallback(() => {
    setOps([]);
    setResult(null);
    setConflict(null);
    void draft.refetch();
  }, [draft]);

  // پیش‌نمایش تا رسیدن پاسخ تازه همان قبلی را نشان می‌دهد تا صفحه نپرد
  const view = ops.length > 0 && result ? result.view : base;

  return {
    view,
    base,
    isLoading: draft.isLoading,
    isError: draft.isError,
    reload,
    ops,
    opErrors: result && result.ops === ops ? result.errors : [],
    isPreviewing,
    conflict,
    apply,
    undo,
    discardLocal,
    save,
    isSaving: saveState.isLoading,
  };
}
