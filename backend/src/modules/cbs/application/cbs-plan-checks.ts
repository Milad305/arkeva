import { Injectable } from '@nestjs/common';
import { type ContentCheckInput, type ContentCheckResult, PlanContentChecks } from '../../wbs/index.js';
import { cbsBudgetTotal, diffCbs, validateCbs } from '../domain/cbs-checks.js';
import { toCbsForest } from '../domain/cbs-tree.js';

// پیاده‌سازی بخش CBS اعتبارسنجی کل نسخهٔ کاری (F04 ۵.۱: V-07، V-08؛ cbs.md ۵.۲: W-06) برای wbs.

@Injectable()
export class CbsPlanChecks extends PlanContentChecks {
  check(input: ContentCheckInput): ContentCheckResult {
    const live = input.project.status === 'active' || input.project.status === 'paused';
    const { errors, warnings } = validateCbs(toCbsForest(input.draft.cbs), input.draft.links, live);
    const diff = diffCbs(input.current.cbs, input.draft.cbs, input.current.links, input.draft.links);
    const budgetRevision = live && diff.budget.size > 0;
    const cbsChanged = diff.added.size + diff.removed.length + diff.changed.size + diff.moved.size > 0;
    return {
      errors,
      warnings,
      changeCount: diff.count,
      budgetRevision,
      ...(cbsChanged
        ? {
            impact: {
              added: diff.added.size,
              removed: diff.removed.length,
              changed: diff.changed.size,
              budgetChange: (cbsBudgetTotal(input.draft.cbs) - cbsBudgetTotal(input.current.cbs)).toString(),
              isBudgetRevision: budgetRevision,
            },
          }
        : {}),
    };
  }
}
