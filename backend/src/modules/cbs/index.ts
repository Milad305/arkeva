// API عمومی ماژول cbs (docs/backend/03 ۵).
import { BudgetRevisionRequest } from './domain/budget-revision.entity.js';

export { CbsModule } from './cbs.module.js';
export { COST_TYPE_LABELS } from './application/cbs-import.js';

export const CBS_ENTITIES = [BudgetRevisionRequest];
export const CBS_TENANT_ENTITIES = [BudgetRevisionRequest];
