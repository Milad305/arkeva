import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectPlanState } from '../../projects/index.js';
import type { AddedTask } from '../domain/sync-diff.js';
import { MspSyncChange, type MspSyncSession } from '../domain/msp.entities.js';
import { ProgressExport } from './progress-export.js';

// شکل SyncSessionDto فرانت (W36؛ msp-integration.md ۷.۳).

type Tone = 'ok' | 'inf' | 'err' | 'neu' | 'wrn' | 'pri';
const META: Record<string, { label: string; tone: Tone; icon: string }> = {
  add: { label: 'جدید', tone: 'ok', icon: 'plus' },
  update: { label: 'تغییر', tone: 'inf', icon: 'pencil' },
  delete: { label: 'حذف', tone: 'err', icon: 'trash-2' },
  move: { label: 'جابه‌جایی', tone: 'neu', icon: 'move' },
  conflict: { label: 'تعارض', tone: 'wrn', icon: 'git-compare-arrows' },
  date: { label: 'تاریخ', tone: 'inf', icon: 'calendar' },
  title: { label: 'عنوان', tone: 'neu', icon: 'pencil' },
};
const FIELD: Record<string, string> = {
  title: 'عنوان',
  code: 'کد',
  unit: 'واحد',
  totalQuantity: 'مقدار کل',
  plannedStart: 'شروع برنامه‌ای',
  plannedFinish: 'پایان برنامه‌ای',
  parent: 'والد',
  item: 'کل آیتم',
};
const fa = (value: number | string) => toFaDigits(value);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const show = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (isDate(value)) return fa(formatJalali(value));
  if (typeof value === 'number') return fa(value);
  if (typeof value === 'string') return value;
  return '—';
};

@Injectable()
export class SyncViews {
  constructor(
    private readonly em: EntityManager,
    private readonly identity: IdentityService,
    private readonly planState: ProjectPlanState,
    private readonly exports: ProgressExport,
  ) {}

  change(row: MspSyncChange) {
    const metaKey = row.changeType === 'update' && (row.field === 'plannedStart' || row.field === 'plannedFinish') ? 'date' : row.changeType;
    const meta = META[metaKey] ?? { label: '', tone: 'inf' as const, icon: 'pencil' };
    const kind = META[row.changeType] as (typeof META)[string];
    const added = row.changeType === 'add' ? (row.mspValue as AddedTask) : null;
    const move = row.changeType === 'move' ? (row.mspValue as { parentCode: string | null }) : null;
    return {
      id: row.id,
      kind: row.changeType,
      kindLabel: kind.label,
      tone: meta.tone,
      icon: meta.icon,
      code: row.code,
      title: row.title,
      field: FIELD[row.field] ?? row.field,
      current: row.changeType === 'delete' ? 'در برنامهٔ جاری هست' : row.changeType === 'move' ? `زیر ${show(row.projeyarValue)}` : show(row.projeyarValue),
      incoming: added
        ? `شروع ${show(added.start)} · ${fa(added.durationDays)} روز`
        : row.changeType === 'delete'
          ? 'در فایل جدید نیست'
          : move
            ? `زیر ${show(move.parentCode)}`
            : show(row.mspValue),
      effect:
        row.changeType === 'add'
          ? 'وزن ندارد؛ پس از اعمال وزن گروه دوباره پخش می‌شود'
          : row.changeType === 'delete'
            ? row.hasApprovedReports
              ? 'گزارش تأییدشده دارد؛ حذف نرم با تاریخچه (OD-04)'
              : 'پیش‌فرض انتخاب‌نشده'
            : row.changeType === 'conflict'
              ? 'در هر دو طرف از آخرین همگام‌سازی عوض شده است'
              : null,
      effectTone: row.changeType === 'add' || row.changeType === 'conflict' ? ('wrn' as const) : row.changeType === 'delete' ? ('err' as const) : null,
      selected: row.selected,
      resolution: row.resolution ?? null,
      hasApprovedReports: row.hasApprovedReports,
    };
  }

  async session(session: MspSyncSession) {
    const [rows, people, plan, pending] = await Promise.all([
      this.em.find(MspSyncChange, { sessionId: session.id }, { orderBy: { sortOrder: 'asc' } }),
      this.identity.personRefs([session.createdByUserId]),
      this.planState.state(session.projectId),
      this.exports.pending(session.projectId),
    ]);
    const changes = rows.map((row) => this.change(row));
    const selected = changes.filter((change) => change.selected);
    const counts: { kind: string; label: string; count: number; tone: Tone }[] = [];
    const push = (key: string, count: number) => {
      const meta = META[key] as (typeof META)[string];
      if (count > 0) counts.push({ kind: key, label: meta.label, count, tone: meta.tone });
    };
    push('add', rows.filter((row) => row.changeType === 'add').length);
    push('date', rows.filter((row) => row.changeType === 'update' && (row.field === 'plannedStart' || row.field === 'plannedFinish')).length);
    push('title', rows.filter((row) => row.changeType === 'update' && row.field === 'title').length);
    push('move', rows.filter((row) => row.changeType === 'move').length);
    push('conflict', rows.filter((row) => row.changeType === 'conflict').length);
    push('delete', rows.filter((row) => row.changeType === 'delete').length);
    return {
      id: session.id,
      projectId: session.projectId,
      fileName: session.fileName,
      uploadedByName: people.get(session.createdByUserId)?.fullName ?? '',
      uploadedAt: session.createdAt.toISOString(),
      comparedWith: plan.current ? `Rev${fa(plan.current.number)}` : 'برنامهٔ مبنا',
      source: 'xml' as const,
      sourceNote: null,
      status: session.status === 'cancelled' ? ('blocked' as const) : session.status,
      blockedReason: session.status === 'cancelled' ? 'فایل تازه‌تری بارگذاری شده است؛ همان را بررسی کنید.' : (session.blockedReason ?? null),
      changes,
      counts,
      impact: [
        { label: 'تعداد تغییرهای انتخاب‌شده', before: fa(changes.length), after: fa(selected.length), tone: 'pri' as const },
        { label: 'آیتم‌های تازه', before: '—', after: fa(selected.filter((change) => change.kind === 'add').length), tone: 'ok' as const },
        { label: 'حذف‌های انتخاب‌شده', before: '—', after: fa(selected.filter((change) => change.kind === 'delete').length), tone: 'err' as const },
        { label: 'برنامهٔ مبنا', before: 'دست‌نخورده', after: 'دست‌نخورده', tone: 'neu' as const },
      ],
      nextRevisionNumber: (plan.current?.number ?? 0) + 1,
      pendingExport: { count: pending.progress, sinceLabel: pending.since ? fa(formatJalali(pending.since)) : '—' },
    };
  }
}
