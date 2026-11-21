import { DEMO_ORG_ID, DEMO_PROJECT_IDS, DEMO_USER_IDS, type DemoUserKey } from '@projeyar/shared';
import type pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { SYSTEM_ROLE_IDS } from '../database/system-ids.js';

// برنامهٔ مبنای «ساختمان مثال مرجع» (00-overview ۶.۱؛ cbs.md ۹.۱) برای دادهٔ نمونهٔ توسعه: WBS چهاربرگی، CBS چهارقلمی،
// نُه اتصال (BAC = ۱٬۰۰۰ میلیون ریال)، دو سرپرست با تخصیص، یک حوزهٔ تأیید. همان شکلی که اعمال مبنا (F02 ۸.۱) می‌سازد:
// نسخهٔ ۰ اعمال‌شده، جدول‌های جاری و عکس نسخه. فقط اگر پروژه هنوز نسخه‌ای ندارد (تکرارپذیر).

const M = 1_000_000n;
const DEMO_PROJECT_ID = DEMO_PROJECT_IDS.reference;
const user = (key: DemoUserKey) => DEMO_USER_IDS[key];

interface WbsRow {
  readonly key: string;
  readonly parent: string | null;
  readonly code: string;
  readonly title: string;
  readonly sort: number;
  readonly leaf: boolean;
  readonly weight: number;
  readonly start: string;
  readonly finish: string;
  readonly unit?: string;
  readonly qty?: number;
  readonly method?: 'quantity' | 'percent' | 'steps';
  readonly steps?: { key: string; title: string; weight: number }[];
  readonly supervisor?: DemoUserKey;
  readonly bac: bigint;
}

const WBS: readonly WbsRow[] = [
  { key: 'g1', parent: null, code: '1.1', title: 'فونداسیون', sort: 0, leaf: false, weight: 40, start: '2026-03-25', finish: '2026-05-31', bac: 400n * M },
  {
    key: 'l111',
    parent: 'g1',
    code: '1.1.1',
    title: 'خاکبرداری',
    sort: 0,
    leaf: true,
    weight: 30,
    start: '2026-03-25',
    finish: '2026-04-20',
    unit: 'm³',
    qty: 500,
    method: 'quantity',
    supervisor: 'nouri',
    bac: 100n * M,
  },
  {
    key: 'l112',
    parent: 'g1',
    code: '1.1.2',
    title: 'بتن‌ریزی فونداسیون',
    sort: 1,
    leaf: true,
    weight: 70,
    start: '2026-04-21',
    finish: '2026-05-31',
    unit: 'm³',
    qty: 200,
    method: 'quantity',
    supervisor: 'nouri',
    bac: 300n * M,
  },
  { key: 'g2', parent: null, code: '1.2', title: 'اسکلت', sort: 1, leaf: false, weight: 60, start: '2026-06-10', finish: '2026-09-22', bac: 600n * M },
  {
    key: 'l121',
    parent: 'g2',
    code: '1.2.1',
    title: 'ستون‌ها',
    sort: 0,
    leaf: true,
    weight: 50,
    // تقویم شش‌روزه (جمعه تعطیل، پنجشنبه نیم‌روز): ۱۰ از ۲۰ روز کاری تا 2026-06-21 ← ۵۰٪ (00 ۶.۱)
    start: '2026-06-10',
    finish: '2026-07-02',
    method: 'steps',
    steps: [
      { key: 'formwork', title: 'قالب', weight: 20 },
      { key: 'rebar', title: 'آرماتور', weight: 20 },
      { key: 'concrete', title: 'بتن', weight: 60 },
    ],
    supervisor: 'jamali',
    bac: 300n * M,
  },
  {
    key: 'l122',
    parent: 'g2',
    code: '1.2.2',
    title: 'سقف',
    sort: 1,
    leaf: true,
    weight: 50,
    start: '2026-07-04',
    finish: '2026-09-22',
    method: 'percent',
    supervisor: 'jamali',
    bac: 300n * M,
  },
];

interface CbsRow {
  readonly key: string;
  readonly code: string;
  readonly title: string;
  readonly type: string;
  readonly unit: string | null;
  readonly qty: number | null;
  readonly rate: bigint | null;
  readonly lump: bigint | null;
}

const CBS: readonly CbsRow[] = [
  { key: 'C1', code: 'C1', title: 'خاکبرداری (پیمانکار جزء)', type: 'subcontract', unit: 'm³', qty: 500, rate: M / 5n, lump: null },
  { key: 'C2', code: 'C2', title: 'بتن آماده', type: 'materials', unit: 'm³', qty: 400, rate: M, lump: null },
  { key: 'C3', code: 'C3', title: 'آرماتور', type: 'materials', unit: 't', qty: 6, rate: 50n * M, lump: null },
  { key: 'C4', code: 'C4', title: 'نیروی انسانی اسکلت', type: 'labor', unit: null, qty: null, rate: null, lump: 200n * M },
];

/** [برگ WBS، قلم CBS، مقدار یا مبلغ (میلیون)، زیربودجه (میلیون)] — cbs.md ۹.۱. */
const LINKS: readonly [string, string, number, bigint][] = [
  ['l111', 'C1', 500, 100n],
  ['l112', 'C2', 200, 200n],
  ['l112', 'C3', 2, 100n],
  ['l121', 'C2', 50, 50n],
  ['l121', 'C3', 2, 100n],
  ['l121', 'C4', 150, 150n],
  ['l122', 'C2', 150, 150n],
  ['l122', 'C3', 2, 100n],
  ['l122', 'C4', 50, 50n],
];

export interface ReferenceTarget {
  readonly orgId: string;
  readonly projectId: string;
  /** اعمال‌کنندهٔ مبنا. */
  readonly actorUserId: string;
  readonly now: string;
}

export interface ReferencePlan {
  readonly versionId: string;
  /** کلید ردیف (l111، C2، …) ← شناسه. */
  readonly ids: ReadonlyMap<string, string>;
}

/** فقط برنامه: نسخهٔ ۰ اعمال‌شده، جدول‌های جاری، عکس نسخه و شناسه‌های نسخه روی پروژه — برای دادهٔ نمونه و تست محاسبات. */
export async function insertReferencePlan(client: pg.ClientBase, target: ReferenceTarget): Promise<ReferencePlan> {
  const ORG = target.orgId;
  const PROJECT = target.projectId;
  const now = target.now;
  const appliedAt = '2026-03-25T05:30:00Z';
  const versionId = uuidv7();
  const ids = new Map([...WBS.map((row) => [row.key, uuidv7()] as const), ...CBS.map((row) => [row.key, uuidv7()] as const)]);
  const id = (key: string) => ids.get(key) as string;

  await client.query(
    `insert into plan_version (id, org_id, project_id, kind, number, status, source, note, draft_revision, change_count, last_saved_at,
       last_saved_by_user_id, applied_by_user_id, applied_at, created_by_user_id, created_at, updated_at)
     values ($1, $2, $3, 'baseline', 0, 'applied', 'wizard', 'برنامهٔ مبنا', 1, $4, $5, $6, $6, $5, $6, $7, $7)`,
    [versionId, ORG, PROJECT, WBS.length + CBS.length + LINKS.length, appliedAt, target.actorUserId, now],
  );

  for (const row of WBS) {
    const values = [
      id(row.key),
      ORG,
      PROJECT,
      row.parent ? id(row.parent) : null,
      row.code,
      row.title,
      row.sort,
      row.leaf,
      row.weight,
      row.start,
      row.finish,
      row.unit ?? null,
      row.qty ?? null,
      row.method ?? null,
      row.steps ? JSON.stringify(row.steps) : null,
    ];
    await client.query(
      `insert into wbs_item (id, org_id, project_id, parent_id, code, code_mode, title, sort_order, is_leaf, is_milestone, weight_in_parent,
         planned_start, planned_finish, unit, total_quantity, measurement_method, steps, supervisor_user_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'auto', $6, $7, $8, false, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)`,
      [...values, row.supervisor && ORG === DEMO_ORG_ID ? user(row.supervisor) : null, now],
    );
    await client.query(
      `insert into wbs_item_plan (plan_version_id, wbs_item_id, org_id, project_id, parent_id, code, code_mode, title, sort_order, is_leaf,
         is_milestone, weight_in_parent, planned_start, planned_finish, unit, total_quantity, measurement_method, steps, bac)
       values ($16, $1, $2, $3, $4, $5, 'auto', $6, $7, $8, false, $9, $10, $11, $12, $13, $14, $15, $17)`,
      [...values, versionId, row.bac.toString()],
    );
  }

  for (const [sort, row] of CBS.entries()) {
    const values = [
      id(row.key),
      ORG,
      PROJECT,
      row.code,
      row.title,
      sort,
      row.type,
      row.unit,
      row.qty,
      row.lump ? 'lump_sum' : 'unit_rate',
      row.rate?.toString() ?? null,
      row.lump?.toString() ?? null,
    ];
    await client.query(
      `insert into cbs_item (id, org_id, project_id, parent_id, code, title, sort_order, is_leaf, cost_type, unit, estimated_quantity,
         pricing_mode, unit_rate, lump_sum_amount, created_at, updated_at)
       values ($1, $2, $3, null, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [...values, now],
    );
    await client.query(
      `insert into cbs_item_plan (plan_version_id, cbs_item_id, org_id, project_id, parent_id, code, title, sort_order, is_leaf, cost_type,
         unit, estimated_quantity, pricing_mode, unit_rate, lump_sum_amount)
       values ($13, $1, $2, $3, null, $4, $5, $6, true, $7, $8, $9, $10, $11, $12)`,
      [...values, versionId],
    );
  }

  for (const [wbsKey, cbsKey, value, subBudget] of LINKS) {
    const lump = CBS.find((row) => row.key === cbsKey)?.lump !== null;
    const quantity = lump ? null : value;
    const amount = lump ? (BigInt(value) * M).toString() : null;
    await client.query(
      `insert into wbs_cbs_link (org_id, project_id, wbs_item_id, cbs_item_id, quantity, allocated_amount, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [ORG, PROJECT, id(wbsKey), id(cbsKey), quantity, amount, now],
    );
    await client.query(
      `insert into wbs_cbs_link_plan (plan_version_id, wbs_item_id, cbs_item_id, org_id, project_id, quantity, allocated_amount, sub_budget)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [versionId, id(wbsKey), id(cbsKey), ORG, PROJECT, quantity, amount, (subBudget * M).toString()],
    );
  }

  await client.query('update project set baseline_version_id = $1, current_version_id = $1, pv_reference_version_id = $1 where id = $2', [versionId, PROJECT]);
  return { versionId, ids };
}

export async function seedReferencePlan(client: pg.Client, now: string): Promise<boolean> {
  const existing = await client.query('select 1 from plan_version where project_id = $1 limit 1', [DEMO_PROJECT_ID]);
  if (existing.rowCount) return false;
  const ORG = DEMO_ORG_ID;
  const PROJECT = DEMO_PROJECT_ID;
  const appliedAt = '2026-03-25T05:30:00Z';
  const { ids } = await insertReferencePlan(client, { orgId: ORG, projectId: PROJECT, actorUserId: user('ahmadi'), now });
  const id = (key: string) => ids.get(key) as string;

  // دو سرپرست کارگاه و تخصیص (F07 ۵): نوری فونداسیون، جمالی اسکلت
  for (const key of ['nouri', 'jamali'] as const) {
    const found = await client.query<{ id: string }>('select id from project_member where project_id = $1 and user_id = $2', [PROJECT, user(key)]);
    const memberId = found.rows[0]?.id ?? uuidv7();
    if (!found.rowCount) {
      await client.query(
        `insert into project_member (id, org_id, project_id, user_id, status, created_at, updated_at) values ($1, $2, $3, $4, 'active', $5, $5)`,
        [memberId, ORG, PROJECT, user(key), now],
      );
    }
    await client.query(`insert into project_member_role (id, org_id, member_id, role_id, created_at) values ($1, $2, $3, $4, $5)`, [
      uuidv7(),
      ORG,
      memberId,
      SYSTEM_ROLE_IDS.supervisor,
      now,
    ]);
  }
  for (const row of WBS.filter((entry) => entry.supervisor)) {
    await client.query(
      `insert into wbs_assignment_history (id, org_id, project_id, wbs_item_id, supervisor_user_id, from_at, assigned_by_user_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv7(), ORG, PROJECT, id(row.key), user(row.supervisor as DemoUserKey), appliedAt, user('ahmadi'), now],
    );
  }

  // حوزهٔ تأیید (F07 ۶): همهٔ کار به ناظر پروژه
  await client.query(
    `insert into approval_route (id, org_id, project_id, area_name, root_item_ids, reviewer_user_id, sort_order, created_at, updated_at)
     values ($1, $2, $3, 'سازه و فونداسیون', $4, $5, 0, $6, $6)`,
    [uuidv7(), ORG, PROJECT, JSON.stringify([id('g1'), id('g2')]), user('karimi'), now],
  );
  return true;
}
