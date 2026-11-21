import { defineEntity, p } from '@mikro-orm/postgresql';

// هشدار و تنظیم قاعده (`02` ۱۰؛ 04-alert-engine ۲). مالک: alerts (F12). هشدار عملیاتی است و فقط موتور ارزیابی و
// فرمان‌های دیدن و ردکردن آن را می‌نویسند.

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export const ALERT_STATUSES = ['open', 'seen', 'resolved', 'dismissed'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export const SUBJECT_TYPES = ['wbs_item', 'cbs_item', 'project', 'user_in_project', 'risk', 'integration', 'period'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

const AlertSchema = defineEntity({
  name: 'Alert',
  tableName: 'alert',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    ruleCode: p.string(),
    severity: p.enum(ALERT_SEVERITIES),
    subjectType: p.enum(SUBJECT_TYPES),
    subjectId: p.uuid(),
    /** `ruleCode:subjectType:subjectId` — یکتا میان open و seen. */
    dedupeKey: p.string(),
    status: p.enum(ALERT_STATUSES).default('open'),
    title: p.string(),
    /** متن راهنما با مقادیر لحظهٔ ارزیابی (۵). */
    guidance: p.text(),
    /** همان متن بی مبلغ برای کسی که `cbs.view_amounts` ندارد (AC-AL-07). */
    guidanceSafe: p.text(),
    actionLink: p.string(),
    payload: p.json<Record<string, unknown>>(),
    /** گیرندگان ساخته‌شده از مخاطب قاعده در آخرین ارزیابی. */
    audience: p.json<string[]>(),
    firstTriggeredAt: p.datetime(),
    lastEvaluatedAt: p.datetime(),
    resolvedAt: p.datetime().nullable(),
    resolveReason: p.string().nullable(),
    dismissedByUserId: p.uuid().nullable(),
    dismissReason: p.text().nullable(),
    dismissedAt: p.datetime().nullable(),
    /** ردشده‌ای که شرطش یک بار رفع شد؛ برقراری دوباره هشدار تازه می‌سازد (۲.۲). */
    conditionClearedAt: p.datetime().nullable(),
    seenAt: p.datetime().nullable(),
  },
});
export class Alert extends AlertSchema.class {}
AlertSchema.setClass(Alert);

/** پارامتر و روشن/خاموش قاعده (۲.۴): `projectId` تهی = پیش‌فرض سازمان. */
const AlertRuleSettingSchema = defineEntity({
  name: 'AlertRuleSetting',
  tableName: 'alert_rule_setting',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    ruleCode: p.string(),
    enabled: p.boolean().nullable(),
    params: p.json<Record<string, number>>(),
    updatedByUserId: p.uuid().nullable(),
    updatedAt: p.datetime(),
  },
});
export class AlertRuleSetting extends AlertRuleSettingSchema.class {}
AlertRuleSettingSchema.setClass(AlertRuleSetting);

export const ALERT_ENTITIES = [Alert, AlertRuleSetting];
