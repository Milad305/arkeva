import { useCallback, useEffect, useRef, useState } from 'react';

import type { EntityId } from '@/shared/types/api';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { OpError } from '@/modules/wbs/types/draft';
import { useGetCbsDraftQuery, usePreviewCbsOpsMutation, useSaveCbsOpsMutation } from '../api/cbsDraftApi';
import type { CbsDraftTreeDto, CbsOp } from '../types/draft';

const PREVIEW_DELAY_MS = 220;

/** ویرایش پشت‌سرهم یک قلم یک عمل بماند تا واگرد معنادار باشد. */
export function pushCbsOp(ops: CbsOp[], op: CbsOp): CbsOp[] {
  const last = ops[ops.length - 1];
  if (op.type === 'update' && last?.type === 'update' && last.id === op.id) {
    return [...ops.slice(0, -1), { ...last, patch: { ...last.patch, ...op.patch } }];
  }
  if (op.type === 'setPricing' && last?.type === 'setPricing' && last.id === op.id) {
    return [...ops.slice(0, -1), { ...last, ...op }];
  }
  return [...ops, op];
}

const isConflict = (cause: unknown) => typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 409;

export interface CbsDraftEditor {
  view: CbsDraftTreeDto | undefined;
  base: CbsDraftTreeDto | undefined;
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
  ops: CbsOp[];
  opErrors: OpError[];
  isPreviewing: boolean;
  conflict: string | null;
  apply: (op: CbsOp) => void;
  undo: () => void;
  save: () => Promise<Record<EntityId, EntityId> | null>;
  isSaving: boolean;
}

/** همان الگوی W12: فهرست عملیات در مرورگر، پیش‌نمایش سرور، ذخیره با `draftRevision`. */
export function useCbsDraftEditor(projectId: EntityId): CbsDraftEditor {
  const draft = useGetCbsDraftQuery(projectId);
  const [preview] = usePreviewCbsOpsMutation();
  const [saveOps, saveState] = useSaveCbsOpsMutation();

  const [ops, setOps] = useState<CbsOp[]>([]);
  const [result, setResult] = useState<{ ops: CbsOp[]; view: CbsDraftTreeDto; errors: OpError[] } | null>(null);
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
          if (request === requestRef.current && isConflict(cause)) setConflict(getApiErrorMessage(cause));
        })
        .finally(() => {
          if (request === requestRef.current) setIsPreviewing(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [base, ops, preview, projectId]);

  const apply = useCallback((op: CbsOp) => setOps((previous) => pushCbsOp(previous, op)), []);
  const undo = useCallback(() => setOps((previous) => previous.slice(0, -1)), []);

  const save = useCallback(async () => {
    if (!base || ops.length === 0) return null;
    try {
      const response = await saveOps({ projectId, draftRevision: base.draftRevision, ops }).unwrap();
      setOps([]);
      setResult(null);
      setConflict(null);
      return response.idMap;
    } catch (cause) {
      if (isConflict(cause)) setConflict(getApiErrorMessage(cause));
      return null;
    }
  }, [base, ops, projectId, saveOps]);

  const reload = useCallback(() => {
    setOps([]);
    setResult(null);
    setConflict(null);
    void draft.refetch();
  }, [draft]);

  return {
    view: ops.length > 0 && result ? result.view : base,
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
    save,
    isSaving: saveState.isLoading,
  };
}
