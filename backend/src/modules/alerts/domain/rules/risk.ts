import { fa } from '../text.js';
import type { RuleDef } from '../rule-types.js';
import { param } from './progress-cost.js';

// قواعد ریسک و AL-X-01 (04-alert-engine ۳.۶، ۳.۷؛ risk.md ۷؛ برش ۱۳ب). واقعیت‌ها فقط ریسک‌های باز (identified، assessed، in_action).

const PM = { role: 'pm' } as const;
const PLANNER = { role: 'planner' } as const;
const LEVEL_TEXT: Record<string, string> = { high: 'بالا', critical: 'بحرانی' };
const DAY = 86_400_000;
const active = (status: string) => status === 'open' || status === 'in_progress';

export const RISK_RULES: RuleDef[] = [
  {
    code: 'AL-RSK-01',
    name: 'ریسک با سطح بالا یا بحرانی',
    group: 'ریسک',
    severityText: 'هشدار / بحرانی',
    canDisable: true,
    params: [],
    title: (v) => `ریسک ${fa(v['code'])} در سطح ${fa(v['level'])}`,
    guidance: (v) => `ریسک ${fa(v['code'])} با امتیاز ${fa(v['score'], 0)} در سطح ${fa(v['level'])} است. برنامهٔ پاسخ را بازبینی کنید.`,
    link: (v) => `/risks/${String(v['id'])}`,
    evaluate: (facts) =>
      facts.risks
        .filter((risk) => (risk.status === 'assessed' || risk.status === 'in_action') && (risk.score ?? 0) >= 15)
        .map((risk) => {
          const critical = (risk.score ?? 0) >= 20;
          return {
            subjectType: 'risk' as const,
            subjectId: risk.id,
            severity: critical ? ('critical' as const) : ('warning' as const),
            values: { id: risk.id, code: risk.code, score: risk.score, level: LEVEL_TEXT[critical ? 'critical' : 'high'] ?? '' },
            audience: [{ userId: risk.ownerUserId }, PM],
          };
        }),
  },
  {
    code: 'AL-RSK-02',
    name: 'اقدام ریسک معوق',
    group: 'ریسک',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: (v) => `اقدام معوق ریسک ${fa(v['code'])}`,
    guidance: (v) => `اقدام «${String(v['title'])}» ${fa(v['days'], 0)} روز از موعدش گذشته است.`,
    link: (v) => `/risks/${String(v['id'])}`,
    // موضوع هر اقدام جداست تا پایان یک اقدام هشدار خودش را رفع کند
    evaluate: (facts) =>
      facts.risks.flatMap((risk) =>
        risk.actions
          .filter((action) => active(action.status) && action.dueDate < facts.today)
          .map((action) => ({
            subjectType: 'risk' as const,
            subjectId: action.id,
            severity: 'warning' as const,
            values: {
              id: risk.id,
              code: risk.code,
              title: action.title,
              days: Math.round((Date.parse(`${facts.today}T00:00:00Z`) - Date.parse(`${action.dueDate}T00:00:00Z`)) / DAY),
            },
            audience: [{ userId: action.ownerUserId }, { userId: risk.ownerUserId }],
          })),
      ),
  },
  {
    code: 'AL-RSK-03',
    name: 'بازبینی ریسک سررسیده',
    group: 'ریسک',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [],
    title: (v) => `بازبینی ریسک ${fa(v['code'])}`,
    guidance: (v) => `موعد بازبینی ریسک ${fa(v['code'])} رسیده است.`,
    link: (v) => `/risks/${String(v['id'])}`,
    evaluate: (facts) =>
      facts.risks
        .filter((risk) => risk.nextReviewDate !== null && risk.nextReviewDate <= facts.today)
        .map((risk) => ({
          subjectType: 'risk' as const,
          subjectId: risk.id,
          severity: 'info' as const,
          values: { id: risk.id, code: risk.code, date: risk.nextReviewDate },
          audience: [{ userId: risk.ownerUserId }],
        })),
  },
  {
    code: 'AL-RSK-04',
    name: 'مشکل کارگاهی ارزیابی‌نشده',
    group: 'ریسک',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('days', 'ارزیابی‌نشده بیش از', 2, 'روز', 1, 14)],
    title: (v) => `مشکل کارگاهی ارزیابی‌نشده ${fa(v['code'])}`,
    guidance: (v) => `مشکل کارگاهی «${String(v['title'])}» هنوز ارزیابی نشده است.`,
    link: (v) => `/risks/${String(v['id'])}`,
    evaluate: (facts, params) =>
      facts.risks
        .filter((risk) => risk.source === 'field' && risk.score === null && facts.nowMs - risk.createdAt.getTime() > (params['days'] ?? 2) * DAY)
        .map((risk) => ({
          subjectType: 'risk' as const,
          subjectId: risk.id,
          severity: 'warning' as const,
          values: { id: risk.id, code: risk.code, title: risk.title },
          audience: [PM],
        })),
  },
  {
    code: 'AL-X-01',
    name: 'تأخیر بحرانی بی ریسک یا اقدام',
    group: 'ترکیبی',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: (v) => `${String(v['code'])} بی ریسک یا اقدام اصلاحی`,
    guidance: (v) => `${String(v['code'])} ${fa(v['d'])}٪ عقب است ولی ریسک یا اقدام اصلاحی ثبت نشده. ریسک ثبت کنید.`,
    link: (v) => `/risks/new?wbs=${String(v['id'])}`,
    evaluate: (facts) => {
      // برگ‌هایی که ریسک باز دارای اقدام باز به آن‌ها پیوند دارد
      const covered = new Set(facts.risks.filter((risk) => risk.actions.some((action) => active(action.status))).flatMap((risk) => risk.wbsItemIds));
      return facts.leaves
        .filter((leaf) => leaf.actual - leaf.planned <= -facts.thresholds.critical && !covered.has(leaf.id))
        .map((leaf) => ({
          subjectType: 'wbs_item' as const,
          subjectId: leaf.id,
          severity: 'warning' as const,
          values: { id: leaf.id, code: leaf.code, d: leaf.actual - leaf.planned },
          audience: [PM, PLANNER],
        }));
    },
  },
];
