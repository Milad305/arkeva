// داده نمونه WBS — جدا از کامپوننت (مطابق frontend-react.md بخش ۱۲.۲).
// مستقیماً از designs/WBS.html wbsTree[] استخراج شده، با اضافه شدن:
//   - id (bigint) — در WBS.html فقط code بود
//   - تبدیل تاریخ‌های شمسی به ISO Gregorian (با jalaliToIso)
//   - محاسبه path/depth/sortOrder
// وقتی بک‌اند آماده شد، این فایل حذف می‌شود و داده از API می‌آید.

import { jalaliToIso } from '@/shared/utils';
import type {
  WbsTreeNode,
  WbsTreeSummary,
  WbsNodeDto,
  WbsImportValidation,
  WbsDeleteCheck,
  CreateWbsNodeDto,
  UpdateWbsNodeDto,
  ReorderWbsNodeDto,
  WbsOwnerDto,
} from '../types';

// ────────── Owners (مطابق owners در WBS.html) ──────────

export const MOCK_WBS_OWNERS: WbsOwnerDto[] = [
  { id: 101, fullName: 'علی محمدی', initials: 'ع.م', avatarColor: 'info' },
  { id: 102, fullName: 'حسن کریمی', initials: 'ح.ک', avatarColor: 'accent' },
  { id: 103, fullName: 'مهندس رضایی', initials: 'م.ر', avatarColor: 'primary' },
  { id: 104, fullName: 'ع. هاشمی', initials: 'ع.ه', avatarColor: 'success' },
  { id: 105, fullName: 'م. نوری', initials: 'م.ن', avatarColor: 'info' },
  { id: 106, fullName: 'ر. جمالی', initials: 'ر.ج', avatarColor: 'warning' },
  { id: 107, fullName: 'ف. مرادی', initials: 'ف.م', avatarColor: 'gray' },
  { id: 108, fullName: 'س. کریمی', initials: 'س.ک', avatarColor: 'primary' },
];

function findOwner(name: string): WbsOwnerDto {
  return MOCK_WBS_OWNERS.find((o) => o.fullName === name) ?? MOCK_WBS_OWNERS[0]!;
}

// ────────── ساخت درخت نمونه ──────────
// counter برای تخصیص id یکتا
let idCounter = 1;
function nextId(): number {
  return idCounter++;
}

// helper: ساخت یک گره با مقادیر پیش‌فرض هوشمند
interface RawLeaf {
  code: string;
  title: string;
  weight: number;
  planned: number;
  actual: number;
  owner?: string;
  unit?: string;
  quantity?: number;
  done?: number;
  startDate?: string; // شمسی در طرح
  endDate?: string;
  critical?: boolean;
  notes?: string;
  cbs?: Array<{ code: string; title: string; budget: number; used: number }>;
  reportsCount?: number;
}

interface RawParent {
  code: string;
  title: string;
  weight: number;
  planned: number;
  actual: number;
  startDate?: string;
  endDate?: string;
  expanded?: boolean;
  children: Array<RawLeaf | RawParent>;
  // برای تست weight mismatch
  weightSumMismatch?: number;
}

function isRawParent(n: RawLeaf | RawParent): n is RawParent {
  return Array.isArray((n as RawParent).children);
}

// تبدیل تاریخ شمسی طرح ('۱۴۰۳/۰۵/۱۰') به ISO Gregorian
// ابتدا ارقام فارسی را به انگلیسی تبدیل می‌کنیم.
function faDateToIso(fa: string | undefined): string | null {
  if (!fa) return null;
  const en = fa.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  try {
    return jalaliToIso(en);
  } catch {
    return null;
  }
}

// ساخت یک WbsTreeNode از raw leaf/parent
function buildNode(
  raw: RawLeaf | RawParent,
  parentId: number | null,
  depth: number,
  sortOrder: number,
  projectId: number,
): WbsTreeNode {
  const id = nextId();
  const isLeaf = !isRawParent(raw);

  //CBS links (فقط leaf)
  const cbsLinks = isLeaf && (raw as RawLeaf).cbs
    ? ((raw as RawLeaf).cbs!.map((c, i) => ({
        id: id * 100 + i,
        cbsCode: c.code,
        cbsTitle: c.title,
        budget: c.budget,
        used: c.used,
      })))
    : [];

  const owner = isLeaf && (raw as RawLeaf).owner ? findOwner((raw as RawLeaf).owner!) : null;

  const deviation = raw.actual - raw.planned;

  const baseNode: WbsNodeDto = {
    id,
    code: raw.code,
    title: raw.title,
    isLeaf,
    weight: raw.weight,
    weightSource: 'manual',
    parentId,
    path: '', // بعداً با parentId chain ساخته می‌شود
    depth,
    sortOrder,
    startDate: faDateToIso(raw.startDate),
    endDate: faDateToIso(raw.endDate),
    quantity: isLeaf ? (raw as RawLeaf).quantity ?? null : null,
    quantityUnit: isLeaf ? (raw as RawLeaf).unit ?? null : null,
    doneQuantity: isLeaf ? (raw as RawLeaf).done ?? null : null,
    ownerId: owner?.id ?? null,
    owner,
    plannedProgress: raw.planned,
    actualProgress: raw.actual,
    deviation,
    cbsLinks,
    reportsCount: isLeaf ? (raw as RawLeaf).reportsCount ?? Math.floor(Math.abs(deviation) / 5) : 0,
    notes: isLeaf ? (raw as RawLeaf).notes ?? null : null,
    isCritical: !!isLeaf && !!(raw as RawLeaf).critical,
    organizationId: 1,
    projectId,
  };

  // فرزندان (parents only)
  const children = isRawParent(raw)
    ? raw.children.map((c, i) => buildNode(c, id, depth + 1, i, projectId))
    : [];

  // weightSumOfChildren / hasWeightMismatch (parents only)
  let weightSumOfChildren: number | null = null;
  let hasWeightMismatch = false;
  if (children.length > 0) {
    weightSumOfChildren = children.reduce((s, c) => s + c.weight, 0);
    // اگر طرح صریح weightSumMismatch داده، از آن استفاده کن (مثل 1.4.1)
    if (isRawParent(raw) && raw.weightSumMismatch !== undefined) {
      weightSumOfChildren = raw.weightSumMismatch;
    }
    hasWeightMismatch = Math.abs(weightSumOfChildren - 100) > 0.01;
  }

  return {
    ...baseNode,
    children,
    weightSumOfChildren,
    hasWeightMismatch,
  };
}

// بازسازی path بر اساس parentId chain — برای debug فقط
function rebuildPaths(nodes: WbsTreeNode[], parentPath = ''): void {
  for (const n of nodes) {
    n.path = parentPath ? `${parentPath}.${n.id}` : String(n.id);
    if (n.children.length > 0) {
      rebuildPaths(n.children, n.path);
    }
  }
}

// ────────── درخت نمونه برای پروژه 21 ──────────

function buildSampleTree(): WbsTreeNode[] {
  idCounter = 1; // reset برای rebuild

  const raw: RawParent[] = [
    {
      code: '1.1', title: 'عملیات خاکی', weight: 15, planned: 100, actual: 100,
      startDate: '۱۴۰۳/۰۵/۱۰', endDate: '۱۴۰۳/۰۷/۲۰',
      children: [
        { code: '1.1.1', title: 'خاکبرداری', weight: 40, planned: 100, actual: 100, owner: 'علی محمدی', unit: 'متر مکعب', quantity: 8400, done: 8400, startDate: '۱۴۰۳/۰۵/۱۰', endDate: '۱۴۰۳/۰۶/۰۵' },
        { code: '1.1.2', title: 'خاکریزی', weight: 30, planned: 100, actual: 100, owner: 'علی محمدی', unit: 'متر مکعب', quantity: 3200, done: 3200, startDate: '۱۴۰۳/۰۶/۰۸', endDate: '۱۴۰۳/۰۶/۲۸' },
        { code: '1.1.3', title: 'تسطیح', weight: 30, planned: 100, actual: 100, owner: 'علی محمدی', unit: 'متر مربع', quantity: 4600, done: 4600, startDate: '۱۴۰۳/۰۷/۰۱', endDate: '۱۴۰۳/۰۷/۲۰' },
      ],
    },
    {
      code: '1.2', title: 'سازه', weight: 45, planned: 80, actual: 72,
      startDate: '۱۴۰۳/۰۷/۲۵', endDate: '۱۴۰۴/۰۵/۳۰',
      children: [
        {
          code: '1.2.1', title: 'فونداسیون', weight: 30, planned: 100, actual: 100,
          startDate: '۱۴۰۳/۰۷/۲۵', endDate: '۱۴۰۳/۱۰/۱۵',
          children: [
            { code: '1.2.1.1', title: 'آرماتوربندی فونداسیون', weight: 40, planned: 100, actual: 100, owner: 'حسن کریمی', unit: 'تن', quantity: 220, done: 220, startDate: '۱۴۰۳/۰۷/۲۵', endDate: '۱۴۰۳/۰۹/۰۵' },
            { code: '1.2.1.2', title: 'قالب‌بندی فونداسیون', weight: 30, planned: 100, actual: 100, owner: 'حسن کریمی', unit: 'متر مربع', quantity: 1800, done: 1800, startDate: '۱۴۰۳/۰۹/۰۸', endDate: '۱۴۰۳/۰۹/۲۵' },
            { code: '1.2.1.3', title: 'بتن‌ریزی فونداسیون', weight: 30, planned: 100, actual: 100, owner: 'حسن کریمی', unit: 'متر مکعب', quantity: 720, done: 720, startDate: '۱۴۰۳/۰۹/۲۸', endDate: '۱۴۰۳/۱۰/۱۵', reportsCount: 8 },
          ],
        },
        {
          code: '1.2.2', title: 'سازه طبقات', weight: 50, planned: 78, actual: 75,
          startDate: '۱۴۰۳/۱۰/۲۰', endDate: '۱۴۰۴/۰۴/۲۵',
          children: [
            { code: '1.2.2.1', title: 'آرماتوربندی ستون‌ها', weight: 35, planned: 90, actual: 88, owner: 'مهندس رضایی', unit: 'تن', quantity: 380, done: 334, startDate: '۱۴۰۳/۱۰/۲۰', endDate: '۱۴۰۴/۰۲/۲۰', reportsCount: 6 },
            { code: '1.2.2.2', title: 'قالب‌بندی ستون‌ها', weight: 25, planned: 80, actual: 75, owner: 'مهندس رضایی', unit: 'متر مربع', quantity: 2400, done: 1800, startDate: '۱۴۰۳/۱۱/۰۵', endDate: '۱۴۰۴/۰۳/۱۰', reportsCount: 4 },
            { code: '1.2.2.3', title: 'بتن‌ریزی ستون‌ها', weight: 40, planned: 70, actual: 65, owner: 'مهندس رضایی', unit: 'متر مکعب', quantity: 980, done: 637, startDate: '۱۴۰۳/۱۱/۱۸', endDate: '۱۴۰۴/۰۴/۲۵', reportsCount: 5 },
          ],
        },
        {
          code: '1.2.3', title: 'سقف', weight: 20, planned: 55, actual: 22,
          startDate: '۱۴۰۴/۰۱/۱۰', endDate: '۱۴۰۴/۰۵/۳۰',
          children: [
            {
              code: '1.2.3.1', title: 'قالب‌بندی سقف طبقهٔ دوم', weight: 50, planned: 55, actual: 22,
              owner: 'ع. هاشمی', unit: 'متر مربع', quantity: 1450, done: 320,
              startDate: '۱۴۰۴/۰۱/۱۰', endDate: '۱۴۰۴/۰۳/۰۵',
              critical: true,
              notes: 'تأخیر اصلی به دلیل تأخیر در تحویل ورق فولادی است. هماهنگی با تأمین‌کننده در دست انجام.',
              reportsCount: 12,
              cbs: [
                { code: 'CBS-007', title: 'قالب فلزی مدولار', budget: 18.5, used: 8.2 },
                { code: 'CBS-023', title: 'نیروی انسانی ماهر', budget: 12.4, used: 5.1 },
                { code: 'CBS-031', title: 'حمل و باربری', budget: 3.8, used: 1.2 },
              ],
            },
            { code: '1.2.3.2', title: 'آرماتوربندی سقف', weight: 50, planned: 55, actual: 22, owner: 'ع. هاشمی', unit: 'تن', quantity: 145, done: 32, startDate: '۱۴۰۴/۰۱/۲۲', endDate: '۱۴۰۴/۰۴/۱۰', reportsCount: 3 },
          ],
        },
      ],
    },
    {
      code: '1.3', title: 'تأسیسات', weight: 25, planned: 45, actual: 32,
      startDate: '۱۴۰۴/۰۲/۰۱', endDate: '۱۴۰۴/۰۷/۲۰',
      children: [
        {
          code: '1.3.1', title: 'برقی', weight: 50, planned: 50, actual: 38,
          children: [
            { code: '1.3.1.1', title: 'لوله‌گذاری برق', weight: 50, planned: 60, actual: 55, owner: 'م. نوری', unit: 'متر', quantity: 2400, done: 1320, reportsCount: 2 },
            { code: '1.3.1.2', title: 'کابل‌کشی برق', weight: 50, planned: 40, actual: 22, owner: 'م. نوری', unit: 'متر', quantity: 4800, done: 1056, reportsCount: 2 },
          ],
        },
        {
          code: '1.3.2', title: 'مکانیکی', weight: 50, planned: 40, actual: 26,
          children: [
            { code: '1.3.2.1', title: 'لوله‌کشی آب', weight: 40, planned: 50, actual: 35, owner: 'ر. جمالی', unit: 'متر', quantity: 1800, done: 630 },
            { code: '1.3.2.2', title: 'لوله‌کشی فاضلاب', weight: 30, planned: 40, actual: 25, owner: 'ر. جمالی', unit: 'متر', quantity: 1200, done: 300 },
            { code: '1.3.2.3', title: 'کانال‌کشی تهویه', weight: 30, planned: 30, actual: 15, owner: 'ر. جمالی', unit: 'متر', quantity: 950, done: 142 },
          ],
        },
      ],
    },
    {
      code: '1.4', title: 'نازک‌کاری', weight: 15, planned: 15, actual: 8,
      children: [
        {
          // Intentional weight mismatch demo: 60+35=95
          code: '1.4.1', title: 'گچ و رنگ', weight: 50, planned: 20, actual: 12,
          weightSumMismatch: 95,
          children: [
            { code: '1.4.1.1', title: 'گچ‌کاری دیوارها', weight: 60, planned: 25, actual: 15, owner: 'ف. مرادی', unit: 'متر مربع', quantity: 7800, done: 1170 },
            { code: '1.4.1.2', title: 'رنگ‌آمیزی', weight: 35, planned: 10, actual: 5, owner: 'ف. مرادی', unit: 'متر مربع', quantity: 7800, done: 390 },
          ],
        },
        {
          code: '1.4.2', title: 'کاشی و سرامیک', weight: 50, planned: 10, actual: 5,
          children: [
            { code: '1.4.2.1', title: 'کاشی‌کاری سرویس‌ها', weight: 50, planned: 12, actual: 6, owner: 'س. کریمی', unit: 'متر مربع', quantity: 850, done: 51 },
            { code: '1.4.2.2', title: 'سرامیک کف', weight: 50, planned: 8, actual: 4, owner: 'س. کریمی', unit: 'متر مربع', quantity: 2200, done: 88 },
          ],
        },
      ],
    },
  ];

  const tree = raw.map((r, i) => buildNode(r, null, 1, i, 21));
  rebuildPaths(tree);
  return tree;
}

// cache برای پروژه 21
let cachedTree21: WbsTreeNode[] | null = null;

export function mockGetWbsTree(projectId: number): WbsTreeNode[] {
  if (projectId === 21) {
    if (!cachedTree21) {
      cachedTree21 = buildSampleTree();
    }
    // clone عمیق برای جلوگیری از mutation
    return structuredCloneSafe(cachedTree21);
  }
  return [];
}

// clone عمیق با حفظ ساختار درختی (structuredClone روی توابع مشکل دارد)
function structuredCloneSafe<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ────────── محاسبه summary ──────────

export function mockGetWbsSummary(tree: WbsTreeNode[]): WbsTreeSummary {
  let totalNodes = 0;
  let leafCount = 0;
  let parentCount = 0;
  let unbalancedParents = 0;

  function walk(nodes: WbsTreeNode[]) {
    for (const n of nodes) {
      totalNodes++;
      if (n.isLeaf) {
        leafCount++;
      } else {
        parentCount++;
        if (n.hasWeightMismatch) unbalancedParents++;
      }
      if (n.children.length > 0) walk(n.children);
    }
  }
  walk(tree);

  const rootWeightSum = tree.reduce((s, n) => s + n.weight, 0);

  return {
    totalNodes,
    leafCount,
    parentCount,
    rootWeightSum,
    hasRootWeightOk: Math.abs(rootWeightSum - 100) < 0.01,
    unbalancedParents,
  };
}

// ────────── اعتبارسنجی حذف (قاعده ۵.۶ AGENTS) ──────────

export function mockCanDelete(node: WbsTreeNode): WbsDeleteCheck {
  const children = node.children.length;
  const reports = node.isLeaf ? node.reportsCount : countReportsRecursive(node);
  const cbsLinks = node.isLeaf ? node.cbsLinks.length : 0;

  // اگر هر کدام از ارجاع‌ها موجود باشد، حذف مسدود
  if (children > 0) {
    return {
      canDelete: false,
      reason: `این آیتم ${children} فرزند دارد — ابتدا فرزندان را حذف یا منتقل کنید.`,
      counts: { children, reports, cbsLinks },
    };
  }
  if (reports > 0) {
    return {
      canDelete: false,
      reason: `این آیتم ${reports} گزارش مرتبط دارد — ابتدا گزارش‌ها را حذف کنید.`,
      counts: { children, reports, cbsLinks },
    };
  }
  if (cbsLinks > 0) {
    return {
      canDelete: false,
      reason: `این آیتم ${cbsLinks} اتصال CBS دارد — ابتدا اتصالات را حذف کنید.`,
      counts: { children, reports, cbsLinks },
    };
  }
  return {
    canDelete: true,
    reason: null,
    counts: { children: 0, reports: 0, cbsLinks: 0 },
  };
}

function countReportsRecursive(node: WbsTreeNode): number {
  let count = node.reportsCount;
  for (const c of node.children) count += countReportsRecursive(c);
  return count;
}

// ────────── اعتبارسنجی import (مطابق Modals.html #m-upload state 2) ──────────

export function mockValidateImport(_fileName: string): WbsImportValidation {
  // خروجی ثابت برای تست UI
  return {
    totalDetected: 120,
    emptyWeights: 3,
    weightSumWarnings: [{ level: 2, sum: 98 }],
    duplicateCodes: ['C.1.2.1'],
    errors: ['۱ آیتم با کد تکراری C.1.2.1'],
    preview: [
      { code: '1', title: 'مجتمع مسکونی نگین شهر', weight: null },
      { code: '1.1', title: 'عملیات خاکی', weight: 15 },
      { code: '1.1.1', title: 'خاکبرداری', weight: 40 },
      { code: '1.1.2', title: 'خاکریزی', weight: 30 },
      { code: '1.1.3', title: 'تسطیح', weight: 30 },
      { code: '1.2', title: 'سازه', weight: 45 },
      { code: '1.2.1', title: 'فونداسیون', weight: 30 },
      { code: '1.2.1.1', title: 'آرماتوربندی فونداسیون', weight: 40 },
      { code: '1.2.1.2', title: 'قالب‌بندی فونداسیون', weight: 30 },
      { code: '1.2.1.3', title: 'بتن‌ریزی فونداسیون', weight: 30 },
    ],
  };
}

// ────────── Mutation helpers (mock) ──────────
// وقتی بک‌اند آماده شود، این توابع حذف می‌شوند و فقط URL وصل می‌شود.

export function mockCreateNode(dto: CreateWbsNodeDto, existingTree: WbsTreeNode[]): WbsNodeDto {
  const newId = nextId() + 1000; // خارج از بازه نمونه
  const parent = dto.parentId
    ? findInTree(existingTree, dto.parentId)
    : null;

  const newNode: WbsNodeDto = {
    id: newId,
    code: dto.code,
    title: dto.title,
    isLeaf: dto.isLeaf,
    weight: dto.weight,
    weightSource: dto.weightSource ?? 'manual',
    parentId: dto.parentId,
    path: parent ? `${parent.path}.${newId}` : String(newId),
    depth: parent ? parent.depth + 1 : 1,
    sortOrder: 0,
    startDate: dto.startDate ?? null,
    endDate: dto.endDate ?? null,
    quantity: dto.isLeaf ? (dto.quantity ?? null) : null,
    quantityUnit: dto.isLeaf ? (dto.quantityUnit ?? null) : null,
    doneQuantity: dto.isLeaf ? 0 : null,
    ownerId: dto.ownerId ?? null,
    owner: dto.ownerId ? MOCK_WBS_OWNERS.find((o) => o.id === dto.ownerId) ?? null : null,
    plannedProgress: 0,
    actualProgress: 0,
    deviation: 0,
    cbsLinks: [],
    reportsCount: 0,
    notes: dto.notes ?? null,
    isCritical: false,
    organizationId: 1,
    projectId: dto.projectId,
  };
  return newNode;
}

export function mockUpdateNode(
  nodeId: number,
  patch: UpdateWbsNodeDto,
  tree: WbsTreeNode[],
): WbsNodeDto | null {
  const node = findInTree(tree, nodeId);
  if (!node) return null;
  return { ...node, ...patch } as WbsNodeDto;
}

export function mockReorderNode(
  dto: ReorderWbsNodeDto,
  tree: WbsTreeNode[],
): boolean {
  // فقط موفقیت برمی‌گرداند — تغییر واقعی در cache در service انجام می‌شود
  void dto;
  void tree;
  return true;
}

export function mockDeleteNode(nodeId: number, tree: WbsTreeNode[]): boolean {
  const node = findInTree(tree, nodeId);
  if (!node) return false;
  const check = mockCanDelete(node);
  return check.canDelete;
}

// ────────── Helpers ──────────

export function findInTree(tree: WbsTreeNode[], id: number): WbsTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children.length > 0) {
      const f = findInTree(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function findInTreeByCode(tree: WbsTreeNode[], code: string): WbsTreeNode | null {
  for (const n of tree) {
    if (n.code === code) return n;
    if (n.children.length > 0) {
      const f = findInTreeByCode(n.children, code);
      if (f) return f;
    }
  }
  return null;
}
