import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../platform/http/errors.js';
import { MembershipPort } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import type { ResponseStrategy, ReviewFrequency } from '../domain/risk.entities.js';
import { RiskStore } from './risk-store.js';

// اعتبارسنجی ورودی ریسک (W44، W19) — مشترک ثبت و ویرایش.

export interface RiskInput {
  readonly title: string;
  readonly category: string;
  readonly probability: number | null;
  readonly impact: number | null;
  readonly cause?: string | null;
  readonly event?: string | null;
  readonly consequence?: string | null;
  readonly responseStrategy: ResponseStrategy | null;
  readonly ownerUserId: string;
  readonly triggerText?: string | null;
  readonly costImpact?: string | null;
  readonly scheduleImpactDays?: number | null;
  readonly targetProbability?: number | null;
  readonly targetImpact?: number | null;
  readonly nextReviewDate?: string | null;
  readonly reviewFrequency?: ReviewFrequency | null;
  readonly links: readonly { readonly kind: 'wbs_item' | 'cbs_item'; readonly targetId: string }[];
}

export const riskInvalid = (reason: string) => new DomainError('RISK_INVALID', 422, { reason });
export const riskConflict = (reason: string) => new DomainError('RISK_STATE_CONFLICT', 409, { reason });

const text = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** مبلغ ریال از رشته (ارقام فارسی و جداکننده پذیرفته می‌شود). */
export function rialOf(raw: string | null | undefined, label: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const clean = raw.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[,٬\s]/g, '');
  if (!/^\d+$/.test(clean)) throw riskInvalid(`${label} باید عددی به ریال باشد.`);
  return BigInt(clean).toString();
}

export interface NormalizedRisk {
  readonly title: string;
  readonly category: string;
  readonly probability: number | null;
  readonly impact: number | null;
  readonly cause: string | null;
  readonly event: string | null;
  readonly consequence: string | null;
  readonly responseStrategy: ResponseStrategy | null;
  readonly ownerUserId: string;
  readonly triggerText: string | null;
  readonly costImpact: string | null;
  readonly scheduleImpactDays: number | null;
  readonly targetProbability: number | null;
  readonly targetImpact: number | null;
  readonly nextReviewDate: string | null;
  readonly reviewFrequency: ReviewFrequency | null;
  readonly links: readonly { readonly kind: 'wbs_item' | 'cbs_item'; readonly targetId: string }[];
}

@Injectable()
export class RiskInputs {
  constructor(
    private readonly store: RiskStore,
    private readonly memberships: MembershipPort,
    private readonly planning: PlanningService,
  ) {}

  async members(projectId: string): Promise<string[]> {
    return [...new Set((await this.memberships.memberships()).filter((row) => row.projectId === projectId).map((row) => row.userId))];
  }

  async normalize(orgId: string, projectId: string, input: RiskInput): Promise<NormalizedRisk> {
    const title = input.title.trim();
    if (title.length < 4) throw riskInvalid('عنوان ریسک را کامل بنویسید.');
    if (!(await this.store.categories(orgId)).includes(input.category)) throw riskInvalid('دسته را از فهرست انتخاب کنید.');
    const scale = (value: number | null | undefined) => value === null || value === undefined || (Number.isInteger(value) && value >= 1 && value <= 5);
    if (![input.probability, input.impact, input.targetProbability, input.targetImpact].every(scale)) throw riskInvalid('احتمال و اثر باید بین ۱ تا ۵ باشند.');
    if ((input.probability === null) !== (input.impact === null))
      throw riskInvalid('احتمال و اثر را با هم بدهید، یا هر دو را خالی بگذارید تا ریسک «ارزیابی‌نشده» بماند.');
    if (((input.targetProbability ?? null) === null) !== ((input.targetImpact ?? null) === null)) throw riskInvalid('احتمال و اثر هدف را با هم بدهید.');
    if (!(await this.members(projectId)).includes(input.ownerUserId)) throw riskInvalid('مالک ریسک باید عضو پروژه باشد.');
    const days = input.scheduleImpactDays ?? null;
    if (days !== null && (!Number.isInteger(days) || days < 0 || days > 3650)) throw riskInvalid('اثر زمانی را به روز و بین ۰ تا ۳۶۵۰ بنویسید.');
    if (input.nextReviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.nextReviewDate)) throw riskInvalid('تاریخ بازبینی بعدی درست نیست.');
    const content = await this.planning.currentContent(projectId);
    const wbs = new Set(content.wbs.map((node) => node.id));
    const cbs = new Set(content.cbs.map((node) => node.id));
    const seen = new Set<string>();
    for (const link of input.links) {
      if (!(link.kind === 'wbs_item' ? wbs : cbs).has(link.targetId)) throw riskInvalid('پیوند فقط به فعالیت WBS یا قلم CBS جاری همین پروژه است.');
      seen.add(`${link.kind}|${link.targetId}`);
    }
    return {
      title,
      category: input.category,
      probability: input.probability,
      impact: input.impact,
      cause: text(input.cause),
      event: text(input.event),
      consequence: text(input.consequence),
      responseStrategy: input.responseStrategy,
      ownerUserId: input.ownerUserId,
      triggerText: text(input.triggerText),
      costImpact: rialOf(input.costImpact, 'اثر مالی'),
      scheduleImpactDays: days,
      targetProbability: input.targetProbability ?? null,
      targetImpact: input.targetImpact ?? null,
      nextReviewDate: input.nextReviewDate ?? null,
      reviewFrequency: input.reviewFrequency ?? null,
      links: [...seen].map((key) => {
        const [kind, targetId] = key.split('|') as ['wbs_item' | 'cbs_item', string];
        return { kind, targetId };
      }),
    };
  }
}
