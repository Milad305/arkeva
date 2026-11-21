// قواعد خالص تخصیص و مسیریابی تأیید (team-assignment.md ۵.۱، ۶.۱، ۶.۲). بی پایگاه داده.

/** برگ یا والد WBS جاری برای تخصیص و مسیریابی. */
export interface TeamPlanItem {
  readonly id: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly title: string;
  readonly sortOrder: number;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  readonly measurementMethod: string | null;
  readonly supervisorUserId: string | null;
}

export const NOT_LEAF = 'والد سرپرست نمی‌گیرد؛ انتخاب والد همهٔ برگ‌هایش را انتخاب می‌کند.';
export const TIME_BASED = 'برگ زمانی سرپرست نمی‌گیرد و در اپ دیده نمی‌شود (D03-الف).';

/** برگ فعال غیرزمانی (۵.۱؛ AC-TM-01). */
export function assignableReason(item: Pick<TeamPlanItem, 'isLeaf' | 'measurementMethod'>): string | null {
  if (!item.isLeaf) return NOT_LEAF;
  if (item.measurementMethod === 'time_based') return TIME_BASED;
  return null;
}

/** «انتخاب والد = انتخاب همهٔ برگ‌های فعال غیرزمانی زیردرخت» (AC-TM-02). خود برگ اگر برگ باشد. */
export function assignableLeavesBelow(items: readonly TeamPlanItem[], rootIds: readonly string[]): string[] {
  const children = new Map<string | null, TeamPlanItem[]>();
  for (const item of items) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
  const byId = new Map(items.map((item) => [item.id, item]));
  const out = new Set<string>();
  const visit = (item: TeamPlanItem) => {
    if (item.isLeaf) {
      if (!assignableReason(item)) out.add(item.id);
      return;
    }
    for (const child of children.get(item.id) ?? []) visit(child);
  };
  for (const id of rootIds) {
    const item = byId.get(id);
    if (item) visit(item);
  }
  return [...out];
}

export interface RouteRef {
  readonly id: string;
  readonly rootItemIds: readonly string[];
  readonly reviewerUserId?: string | null;
}

/** حوزهٔ برگ: نزدیک‌ترین نیا (یا خود برگ) که ریشهٔ یک حوزه است؛ تودرتو ← دقیق‌تر برنده (۶.۱؛ AC-TM-03). */
export function routeOf<R extends RouteRef>(items: readonly Pick<TeamPlanItem, 'id' | 'parentId'>[], routes: readonly R[], wbsItemId: string): R | null {
  const parentOf = new Map(items.map((item) => [item.id, item.parentId]));
  const rootOf = new Map<string, R>();
  for (const route of routes) for (const id of route.rootItemIds) rootOf.set(id, route);
  for (let current: string | null = wbsItemId; current; current = parentOf.get(current) ?? null) {
    const found = rootOf.get(current);
    if (found) return found;
  }
  return null;
}

/**
 * تأییدکنندهٔ مرحلهٔ اول با منع خودتأییدی (۶.۲؛ AC-TM-04): تأییدکنندهٔ حوزه ← جایگزین ← مدیر پروژه، هر کدام که
 * نویسنده نباشد. `null` = تأییدکنندهٔ واجد نیست (AL-STR-06).
 */
export function firstStageApprover(input: {
  readonly routeReviewer: string | null;
  readonly alternate: string | null;
  readonly manager: string;
  readonly author: string | null;
}): string | null {
  return [input.routeReviewer, input.alternate, input.manager].find((id): id is string => !!id && id !== input.author) ?? null;
}

/** مرحلهٔ دوم همیشه مدیر پروژه؛ اگر نویسنده خود او باشد، جایگزین (۶.۲). */
export function secondStageApprover(input: { readonly alternate: string | null; readonly manager: string; readonly author: string | null }): string | null {
  return [input.manager, input.alternate].find((id): id is string => !!id && id !== input.author) ?? null;
}

/** AL-RES-01: بار سرپرست بیش از ۲ برابر میانگین سرپرستان فعال (۵.۳). */
export function imbalanced(workload: number, average: number): boolean {
  return average > 0 && workload > 2 * average;
}

export const round1 = (value: number): number => Math.round(value * 10) / 10;
