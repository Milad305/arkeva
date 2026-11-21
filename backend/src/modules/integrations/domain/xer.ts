// خروجی XER برای Primavera P6 (F19 ۶.۳؛ تصمیم 1405/08/26: خروجی واقعی در نسخهٔ اول) — فقط خروجی، هیچ داده‌ای برنمی‌گردد.
// از نسخهٔ جاری: گره‌های میانی ← PROJWBS، برگ‌ها ← TASK (نقطهٔ عطف ← TT_FinMile)، درصد فیزیکی تأییدشده، سرپرست‌ها ← RSRC و
// TASKRSRC. وابستگی (TASKPRED) نمی‌آید چون پروژه‌یار وابستگی نگه نمی‌دارد (D05). متن UTF-8.

export interface XerNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  readonly percent: number;
  readonly supervisorId: string | null;
}

export interface XerInput {
  readonly projectCode: string;
  readonly projectName: string;
  /** «YYYY-MM-DD» */
  readonly exportDate: string;
  readonly workDaysPerWeek: number;
  readonly nodes: readonly XerNode[];
  readonly resources: readonly { readonly id: string; readonly name: string }[];
}

const HOURS_PER_DAY = 8;
const clean = (value: string): string => value.replace(/[\t\r\n]+/g, ' ').trim();
const at = (date: string | null, time: string): string => (date ? `${date} ${time}` : '');
const status = (percent: number): string => (percent >= 100 ? 'TK_Complete' : percent > 0 ? 'TK_Active' : 'TK_NotStart');
const pct = (value: number): string => String(Math.round(Math.min(100, Math.max(0, value)) * 100) / 100);

function table(name: string, fields: readonly string[], rows: readonly (readonly (string | number)[])[]): string[] {
  return [`%T\t${name}`, `%F\t${fields.join('\t')}`, ...rows.map((row) => `%R\t${row.map((cell) => clean(String(cell))).join('\t')}`)];
}

/** ترتیب درخت (پیمایش عمقی؛ sortOrder فقط جای گره میان خواهر و برادرهاست). */
function treeOrder(nodes: readonly XerNode[]): XerNode[] {
  const ids = new Set(nodes.map((node) => node.id));
  const children = new Map<string | null, XerNode[]>();
  for (const node of nodes) {
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  const out: XerNode[] = [];
  const visit = (parent: string | null): void => {
    const list = (children.get(parent) ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
    for (const node of list) {
      out.push(node);
      visit(node.id);
    }
  };
  visit(null);
  return out;
}

export function buildXer(input: XerInput): string {
  const nodes = treeOrder(input.nodes);
  const ids = new Map<string, number>();
  const next = (key: string): number => {
    const existing = ids.get(key);
    if (existing !== undefined) return existing;
    const value = ids.size + 100;
    ids.set(key, value);
    return value;
  };
  const projectId = next('project');
  const calendarId = next('calendar');
  const rootWbs = next('wbs:root');
  const wbsOf = (parentId: string | null): number => (parentId ? next(`wbs:${parentId}`) : rootWbs);
  const starts = nodes.flatMap((node) => (node.plannedStart ? [node.plannedStart] : [])).sort();
  const finishes = nodes.flatMap((node) => (node.plannedFinish ? [node.plannedFinish] : [])).sort();
  const groups = nodes.filter((node) => !node.isLeaf);
  const leaves = nodes.filter((node) => node.isLeaf);
  const resources = input.resources.map((resource) => ({ ...resource, xerId: next(`rsrc:${resource.id}`) }));
  const resourceOf = new Map(resources.map((resource) => [resource.id, resource.xerId]));
  const assigned = leaves.filter((leaf) => leaf.supervisorId && resourceOf.has(leaf.supervisorId));

  const lines = [
    `ERMHDR\t19.12\t${input.exportDate}\tProject\tProjeyar\tProjeyar\tdbxDatabaseNoName\tProject Management\tIRR`,
    ...table(
      'CALENDAR',
      ['clndr_id', 'default_flag', 'clndr_name', 'proj_id', 'clndr_type', 'day_hr_cnt', 'week_hr_cnt'],
      [[calendarId, 'N', `${input.projectCode} calendar`, projectId, 'CA_Project', HOURS_PER_DAY, HOURS_PER_DAY * input.workDaysPerWeek]],
    ),
    ...table(
      'PROJECT',
      ['proj_id', 'proj_short_name', 'plan_start_date', 'plan_end_date', 'clndr_id', 'last_recalc_date'],
      [[projectId, input.projectCode, at(starts[0] ?? null, '08:00'), at(finishes.at(-1) ?? null, '16:00'), calendarId, at(input.exportDate, '00:00')]],
    ),
    ...table(
      'PROJWBS',
      ['wbs_id', 'proj_id', 'seq_num', 'proj_node_flag', 'status_code', 'wbs_short_name', 'wbs_name', 'parent_wbs_id'],
      [
        [rootWbs, projectId, 0, 'Y', 'WS_Open', input.projectCode, input.projectName, ''],
        ...groups.map((node, index) => [wbsOf(node.id), projectId, index + 1, 'N', 'WS_Open', node.code, node.title, wbsOf(node.parentId)]),
      ],
    ),
    ...table(
      'TASK',
      [
        'task_id',
        'proj_id',
        'wbs_id',
        'clndr_id',
        'phys_complete_pct',
        'complete_pct_type',
        'task_type',
        'duration_type',
        'status_code',
        'task_code',
        'task_name',
        'target_start_date',
        'target_end_date',
      ],
      leaves.map((leaf) => [
        next(`task:${leaf.id}`),
        projectId,
        wbsOf(leaf.parentId),
        calendarId,
        pct(leaf.percent),
        'CP_Phys',
        leaf.isMilestone ? 'TT_FinMile' : 'TT_Task',
        'DT_FixedDUR2',
        status(leaf.percent),
        leaf.code,
        leaf.title,
        at(leaf.isMilestone ? leaf.plannedFinish : leaf.plannedStart, '08:00'),
        at(leaf.plannedFinish, '16:00'),
      ]),
    ),
    ...table(
      'RSRC',
      ['rsrc_id', 'rsrc_short_name', 'rsrc_name', 'rsrc_type', 'clndr_id'],
      resources.map((resource, index) => [resource.xerId, `SUP${String(index + 1).padStart(3, '0')}`, resource.name, 'RT_Labor', calendarId]),
    ),
    ...table(
      'TASKRSRC',
      ['taskrsrc_id', 'task_id', 'proj_id', 'rsrc_id'],
      assigned.map((leaf) => [next(`taskrsrc:${leaf.id}`), next(`task:${leaf.id}`), projectId, resourceOf.get(leaf.supervisorId ?? '') ?? '']),
    ),
    '%E',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
