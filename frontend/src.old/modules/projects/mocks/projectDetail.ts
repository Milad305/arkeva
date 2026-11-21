// داده نمونه صفحه جزئیات پروژه — جدا از کامپوننت (مطابق frontend-react.md بخش ۱۲.۲).
// مستقیماً از designs/Project.html استخراج شده.
// وقتی بک‌اند آماده شد، این فایل حذف می‌شود و داده از API می‌آید.

import type {
  ProjectOverviewKpis,
  CriticalWbsItemDto,
  TopCbsItemDto,
  ActivityFeedItemDto,
  SCurvePointDto,
  ProjectTabCounts,
} from '../types';

// تابع کمکی برای ساخت ISO نسبی (نروز相对于 امروز) — برای نمایش «امروز» در S-Curve.
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ────────── KPI های Overview (مطابق 4 stat card در Project.html) ──────────
// پروژهٔ نمونه: «مجتمع مسکونی نگین شهر» — id: 21
const overviewKpisByProject: Record<number, ProjectOverviewKpis> = {
  21: {
    progress: { actual: 65, planned: 70, deviation: -5 },
    budget: {
      totalBudget: 850,
      usedBudget: 550,
      usedPct: 64.7,
    },
    timeline: {
      // کل ۴۳۵ روز، سپری‌شده ۲۸۵، باقی‌مانده ۱۵۰ — مطابق designs
      startDate: '2024-07-22',
      endDate: '2025-11-05',
      totalDays: 435,
      elapsedDays: 285,
      remainingDays: 150,
    },
    kpis: {
      cpi: 0.97,
      spi: 0.93,
      summary: 'هزینهٔ پروژه نزدیک به برنامه، اما در زمان ۷٪ تأخیر داریم.',
    },
  },
};

// fallback برای پروژه‌های بدون دادهٔ overview
const defaultOverview: ProjectOverviewKpis = {
  progress: { actual: 0, planned: 0, deviation: 0 },
  budget: { totalBudget: 0, usedBudget: 0, usedPct: 0 },
  timeline: {
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    totalDays: 0,
    elapsedDays: 0,
    remainingDays: 0,
  },
  kpis: { cpi: 0, spi: 0, summary: 'داده‌ای موجود نیست.' },
};

export function mockGetOverviewKpis(projectId: number): ProjectOverviewKpis {
  return overviewKpisByProject[projectId] ?? defaultOverview;
}

// ────────── آیتم‌های بحرانی WBS (مطابق criticalWbs در Project.html) ──────────

const criticalWbsByProject: Record<number, CriticalWbsItemDto[]> = {
  21: [
    {
      id: 124,
      code: '1.2.4',
      name: 'قالب‌بندی سقف طبقهٔ دوم',
      plannedProgress: 55,
      actualProgress: 22,
      owner: { id: 3, fullName: 'هاشمی', initials: 'ع.ه', avatarColor: 'success' },
    },
    {
      id: 13,
      code: '1.3',
      name: 'اسکلت فلزی بلوک شمالی',
      plannedProgress: 52,
      actualProgress: 30,
      owner: { id: 1, fullName: 'رضایی', initials: 'م.ر', avatarColor: 'accent' },
    },
    {
      id: 152,
      code: '1.5.2',
      name: 'نمای سرامیکی بلوک A',
      plannedProgress: 65,
      actualProgress: 48,
      owner: { id: 2, fullName: 'کریمی', initials: 'س.ک', avatarColor: 'primary' },
    },
    {
      id: 212,
      code: '2.1.2',
      name: 'عایق رطوبتی سقف',
      plannedProgress: 78,
      actualProgress: 60,
      owner: { id: 5, fullName: 'جمالی', initials: 'ر.ج', avatarColor: 'warning' },
    },
    {
      id: 321,
      code: '3.2.1',
      name: 'کابل‌کشی برق طبقهٔ پنجم',
      plannedProgress: 45,
      actualProgress: 32,
      owner: { id: 4, fullName: 'نوری', initials: 'م.ن', avatarColor: 'info' },
    },
  ],
};

export function mockGetCriticalWbs(projectId: number): CriticalWbsItemDto[] {
  return criticalWbsByProject[projectId] ?? [];
}

// ────────── CBS با بیشترین مصرف (مطابق topCbs در Project.html) ──────────

const topCbsByProject: Record<number, TopCbsItemDto[]> = {
  21: [
    { id: 1, code: 'CBS-001', name: 'بتن C30', budget: 180, used: 172 },
    { id: 14, code: 'CBS-014', name: 'آرماتور AIII', budget: 145, used: 132 },
    { id: 23, code: 'CBS-023', name: 'نیروی انسانی ماهر', budget: 98, used: 82 },
    { id: 7, code: 'CBS-007', name: 'قالب فلزی مدولار', budget: 62, used: 48 },
    { id: 19, code: 'CBS-019', name: 'اجاره جرثقیل برجی', budget: 45, used: 32 },
  ],
};

export function mockGetTopCbs(projectId: number): TopCbsItemDto[] {
  return topCbsByProject[projectId] ?? [];
}

// ────────── Activity feed (مطابق feed در Project.html) ──────────

const feedByProject: Record<number, ActivityFeedItemDto[]> = {
  21: [
    {
      id: 1,
      kind: 'info',
      iconName: 'clipboard',
      titleParts: [
        { kind: 'strong', value: 'علی محمدی' },
        { kind: 'text', value: 'گزارش پیشرفت برای ' },
        { kind: 'pill', value: 'بتن‌ریزی فونداسیون بلوک A' },
        { kind: 'text', value: ' ثبت کرد' },
      ],
      meta: '۳ عکس · ۴ متر مکعب · مختصات GPS',
      createdAt: isoDaysFromNow(0),
    },
    {
      id: 2,
      kind: 'success',
      iconName: 'check',
      titleParts: [
        { kind: 'strong', value: 'مهندس رضایی' },
        { kind: 'text', value: 'گزارش ' },
        { kind: 'pill', value: 'بتن‌ریزی فونداسیون' },
        { kind: 'text', value: ' را تأیید کرد' },
      ],
      meta: 'یادداشت: «طبق نقشهٔ شمارهٔ ۱۲ تأیید می‌شود.»',
      createdAt: isoDaysFromNow(0),
    },
    {
      id: 3,
      kind: 'warn',
      iconName: 'alert-triangle',
      titleParts: [
        { kind: 'text', value: 'سامانه تشخیص داد ' },
        { kind: 'pill', value: 'قالب‌بندی سقف طبقهٔ دوم' },
        { kind: 'text', value: ' ۳۳٪ از برنامه عقب است' },
      ],
      meta: 'هشدار خودکار براساس قاعدهٔ انحراف بحرانی',
      createdAt: isoDaysFromNow(0),
    },
    {
      id: 4,
      kind: 'primary',
      iconName: 'user-plus',
      titleParts: [
        { kind: 'strong', value: 'حسن کریمی' },
        { kind: 'text', value: ' به پروژه اضافه شد' },
      ],
      meta: 'نقش: سرپرست کارگاه · بلوک شمالی',
      createdAt: isoDaysFromNow(-1),
    },
    {
      id: 5,
      kind: 'info',
      iconName: 'upload',
      titleParts: [
        { kind: 'text', value: 'آپلود فایل WBS جدید توسط ' },
        { kind: 'strong', value: 'مهندس احمدی' },
      ],
      meta: 'پروژه‌نگین-WBS-v3.xml · ۱۲٫۴ مگابایت · ۲۳۴ آیتم',
      createdAt: isoDaysFromNow(-2),
    },
    {
      id: 6,
      kind: 'error',
      iconName: 'x-circle',
      titleParts: [
        { kind: 'text', value: '۳ گزارش به‌دلیل عدم‌تطابق با عکس‌های پیوست رد شد' },
      ],
      meta: 'بازنگری توسط مهندس رضایی',
      createdAt: isoDaysFromNow(-3),
    },
  ],
};

export function mockGetActivityFeed(projectId: number): ActivityFeedItemDto[] {
  return feedByProject[projectId] ?? [];
}

// ────────── S-Curve (مطابق points[] در Project.html) ──────────

// ۹ نقطه‌ی ماهانه، نقطهٔ ششم «امروز» است.
const sCurveByProject: Record<number, SCurvePointDto[]> = {
  21: [
    { monthLabel: 'مرداد ۰۳', planned: 2, actual: 1, forecast: null, isToday: false },
    { monthLabel: 'مهر ۰۳', planned: 6, actual: 5, forecast: null, isToday: false },
    { monthLabel: 'آذر ۰۳', planned: 14, actual: 12, forecast: null, isToday: false },
    { monthLabel: 'بهمن ۰۳', planned: 32, actual: 26, forecast: null, isToday: false },
    { monthLabel: 'فروردین ۰۴', planned: 56, actual: 50, forecast: null, isToday: false },
    { monthLabel: 'اردیبهشت ۰۴', planned: 70, actual: 65, forecast: null, isToday: true },
    { monthLabel: 'تیر ۰۴', planned: 86, actual: null, forecast: 80, isToday: false },
    { monthLabel: 'شهریور ۰۴', planned: 94, actual: null, forecast: 92, isToday: false },
    { monthLabel: 'آبان ۰۴', planned: 100, actual: null, forecast: 99, isToday: false },
  ],
};

export function mockGetSCurve(projectId: number): SCurvePointDto[] {
  return sCurveByProject[projectId] ?? [];
}

// ────────── شمارش‌های تب (badge روی تب گزارش‌ها و اعضا) ──────────

const tabCountsByProject: Record<number, ProjectTabCounts> = {
  21: { reports: 8, members: 18 },
};

export function mockGetTabCounts(projectId: number): ProjectTabCounts {
  return tabCountsByProject[projectId] ?? { reports: 0, members: 0 };
}
