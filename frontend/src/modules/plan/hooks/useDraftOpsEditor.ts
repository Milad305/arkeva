import { useCallback, useEffect, useRef, useState } from 'react';

import type { EntityId } from '@/shared/types/api';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { OpError } from '@/modules/wbs/types/draft';

const PREVIEW_DELAY_MS = 220;
const isConflict = (cause: unknown) => typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 409;

interface OpsRequest<Op> {
  projectId: EntityId;
  draftRevision: number;
  ops: Op[];
}

export interface DraftOpsEditorOptions<Op, View extends { draftRevision: number }> {
  projectId: EntityId;
  query: { data?: View; isLoading: boolean; isError: boolean; refetch: () => unknown };
  preview: (request: OpsRequest<Op>) => { unwrap: () => Promise<View & { opErrors: OpError[] }> };
  save: (request: OpsRequest<Op>) => { unwrap: () => Promise<unknown> };
  isSaving: boolean;
  /** ادغام عمل تازه با عمل قبلی (ویرایش پشت‌سرهم یک فیلد یک عمل بماند). */
  merge?: (ops: Op[], op: Op) => Op[];
}

export interface DraftOpsEditor<Op, View> {
  view: View | undefined;
  base: View | undefined;
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
  ops: Op[];
  opErrors: OpError[];
  isPreviewing: boolean;
  conflict: string | null;
  apply: (op: Op) => void;
  undo: () => void;
  save: () => Promise<boolean>;
  isSaving: boolean;
}

/**
 * الگوی مشترک ویرایش نسخهٔ کاری (W12، حالت ویرایش CBS، W15): فهرست عملیات در مرورگر،
 * پیش‌نمایش سرور پس از آرام شدن تایپ، ذخیره با `draftRevision` و پیام ۴۰۹.
 */
export function useDraftOpsEditor<Op, View extends { draftRevision: number }>({
  projectId,
  query,
  preview,
  save: saveOps,
  isSaving,
  merge,
}: DraftOpsEditorOptions<Op, View>): DraftOpsEditor<Op, View> {
  const [ops, setOps] = useState<Op[]>([]);
  const [result, setResult] = useState<{ ops: Op[]; view: View; errors: OpError[] } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const requestRef = useRef(0);
  const base = query.data;
  const previewRef = useRef(preview);
  previewRef.current = preview;

  useEffect(() => {
    if (!base || ops.length === 0) {
      setResult(null);
      setIsPreviewing(false);
      return undefined;
    }
    const request = ++requestRef.current;
    setIsPreviewing(true);
    const timer = window.setTimeout(() => {
      previewRef
        .current({ projectId, draftRevision: base.draftRevision, ops })
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
  }, [base, ops, projectId]);

  const apply = useCallback((op: Op) => setOps((previous) => (merge ? merge(previous, op) : [...previous, op])), [merge]);
  const undo = useCallback(() => setOps((previous) => previous.slice(0, -1)), []);

  const save = useCallback(async () => {
    if (!base || ops.length === 0) return false;
    try {
      await saveOps({ projectId, draftRevision: base.draftRevision, ops }).unwrap();
      setOps([]);
      setResult(null);
      setConflict(null);
      return true;
    } catch (cause) {
      if (isConflict(cause)) setConflict(getApiErrorMessage(cause));
      return false;
    }
  }, [base, ops, projectId, saveOps]);

  const reload = useCallback(() => {
    setOps([]);
    setResult(null);
    setConflict(null);
    void query.refetch();
  }, [query]);

  return {
    view: ops.length > 0 && result ? result.view : base,
    base,
    isLoading: query.isLoading,
    isError: query.isError,
    reload,
    ops,
    opErrors: result && result.ops === ops ? result.errors : [],
    isPreviewing,
    conflict,
    apply,
    undo,
    save,
    isSaving,
  };
}
