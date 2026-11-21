import type { DraftState, ProposalInput } from '../../planning/index.js';
import type { WbsOp } from '../domain/ops.js';

/**
 * پروژهٔ متصل به MSP (wbs.md ۹؛ تصمیم کاربر 1405/08/26): تغییر تاریخ برنامه‌ای برگ جاری به‌جای نسخهٔ کاری
 * `ScheduleChangeProposal` می‌شود؛ بقیهٔ فیلدهای همان عمل اجرا می‌شوند. ساختار همچنان فقط‌خواندنی است.
 */
export function splitProposals(state: DraftState, ops: readonly WbsOp[]): { ops: WbsOp[]; proposals: ProposalInput[] } {
  if (!state.project.mspLinked) return { ops: [...ops], proposals: [] };
  const current = new Set(state.current.map((item) => item.id));
  const proposals: ProposalInput[] = [];
  const kept: WbsOp[] = [];
  for (const op of ops) {
    if (op.type !== 'update' || !current.has(op.id) || (op.fields.plannedStart === undefined && op.fields.plannedFinish === undefined)) {
      kept.push(op);
      continue;
    }
    const { plannedStart, plannedFinish, ...rest } = op.fields;
    if (plannedStart !== undefined) proposals.push({ wbsItemId: op.id, field: 'plannedStart', value: plannedStart });
    if (plannedFinish !== undefined) proposals.push({ wbsItemId: op.id, field: 'plannedFinish', value: plannedFinish });
    if (Object.keys(rest).length > 0) kept.push({ ...op, fields: rest });
  }
  return { ops: kept, proposals };
}
