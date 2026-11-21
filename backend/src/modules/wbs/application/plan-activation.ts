import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { PlanningService } from '../../planning/index.js';
import { type ActivationItem, PlanActivation } from '../../projects/index.js';
import type { ValidationIssue } from '../domain/validation.js';
import { WbsDraftService } from './wbs-draft.service.js';

// پیش‌شرط‌ها و هشدارهای برنامه برای فعال‌سازی (F02 ۸.۱) از همان اعتبارسنجی کل نسخهٔ کاری (F04 ۵.۱؛ WBS + CBS)، و اعمال
// مبنا درون تراکنش فعال‌سازی. پیش‌شرط مدیر و تقویم و هشدارهای حوزه، موقعیت کارگاه و هزینه‌ها را projects می‌افزاید.

const METHOD_DATES = new Set(['leaf_without_method', 'leaf_without_dates', 'steps_invalid', 'dates_out_of_range']);

const item = (code: string, label: string, failures: number, detail: string | null, fixAt: ActivationItem['fixAt']): ActivationItem => ({
  code,
  label,
  passed: failures === 0,
  detail: failures === 0 ? null : detail,
  fixAt,
});

const firstOf = (issues: readonly ValidationIssue[], more: string): string | null =>
  issues[0] ? (issues.length > 1 ? `${issues[0].message} (و ${toFaDigits(issues.length - 1)} مورد دیگر ${more})` : issues[0].message) : null;

@Injectable()
export class WbsPlanActivation extends PlanActivation {
  constructor(
    private readonly planning: PlanningService,
    private readonly drafts: WbsDraftService,
  ) {
    super();
  }

  async check(projectId: string) {
    // پروژهٔ پیش‌نویس قدیمی همین‌جا مبنای کاری می‌گیرد (F04 ۳)
    const state = await this.planning.draftState(projectId);
    const { validation } = this.drafts.assess(state);
    const errors = validation.errors as readonly ValidationIssue[];
    const warnings = validation.warnings as readonly ValidationIssue[];
    const leaves = state.nodes.filter((node) => node.isLeaf && !node.isMilestone).length;
    const milestones = state.nodes.filter((node) => node.isMilestone).length;
    const weights = errors.filter((issue) => issue.code === 'weight_sum');
    const methods = errors.filter((issue) => METHOD_DATES.has(issue.code));
    const others = errors.filter((issue) => issue.code !== 'weight_sum' && !METHOD_DATES.has(issue.code));
    const noCbs = warnings.filter((issue) => issue.code === 'leaf_without_cbs').length;
    const noSupervisor = warnings.filter((issue) => issue.code === 'leaf_without_supervisor').length;
    const unallocated = warnings.filter((issue) => issue.code === 'cbs_unallocated').length;
    return {
      blockers: [
        {
          code: 'has_leaf',
          label: 'دست‌کم یک فعالیت (برگ) غیر از نقطهٔ عطف',
          passed: leaves > 0,
          detail:
            leaves > 0 ? `${toFaDigits(leaves)} فعالیت و ${toFaDigits(milestones)} نقطهٔ عطف` : 'ساختار هنوز فعالیتی ندارد؛ در «ویرایش ساختار» فعالیت بیفزایید.',
          fixAt: 'wbs' as const,
        },
        item('weights_100', 'جمع وزن هر گروه و سطح اول ۱۰۰ است', weights.length, firstOf(weights, 'هم وزن ناقص دارند'), 'wbs'),
        item('leaf_method_dates', 'هر برگ روش اندازه‌گیری و تاریخ برنامه‌ای دارد', methods.length, firstOf(methods, 'هم ناقص‌اند'), 'wbs'),
        item(
          'draft_valid',
          'نسخهٔ کاری معتبر است',
          others.length,
          firstOf(others, 'هم هست'),
          others.some((issue) => issue.code.startsWith('cbs_')) ? 'cbs' : 'wbs',
        ),
      ],
      warnings: [
        item('AL-STR-01', 'برگ بدون اتصال CBS', noCbs, `${toFaDigits(noCbs)} برگ هزینه ندارند و EV نمی‌گیرند`, 'links'),
        item('AL-STR-04', 'برگ بدون سرپرست', noSupervisor, `${toFaDigits(noSupervisor)} برگ در اپ به کسی نمی‌رسد`, 'assignment'),
        // متن هشدار W-06 مبلغ دارد؛ اینجا فقط وجودش (D11)
        item('AL-STR-02', 'بودجهٔ تخصیص‌نیافته', unallocated, 'بخشی از بودجهٔ CBS به فعالیتی نرسیده و در BAC نیست', 'cbs'),
      ],
    };
  }

  applyBaseline(tx: EntityManager, projectId: string): Promise<{ readonly versionId: string }> {
    return this.planning.applyBaseline(tx, projectId, (state) => this.drafts.verdict(state));
  }
}
