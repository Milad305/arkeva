// API عمومی ماژول planning (docs/backend/03 ۵).
import { CbsItem, CbsItemPlan, PlanVersion, WbsCbsLink, WbsCbsLinkPlan, WbsItem, WbsItemPlan } from './domain/plan.entities.js';
import { ScheduleChangeProposal } from './domain/proposal.entity.js';

export { PlanningModule } from './planning.module.js';
export { PlanSearch, type WbsHit } from './application/plan-search.js';
export { BaselineReplacer } from './application/baseline-replacer.js';
export { type ProposalInput, type ProposalView, ScheduleProposals } from './application/schedule-proposals.js';
export { type ProposalField } from './domain/proposal.entity.js';
export {
  type ApplyVerdict,
  type CurrentContent,
  type CurrentItem,
  type DraftState,
  MILESTONE_GROUP_TITLE,
  type PlanContent,
  PlanningService,
} from './application/planning.service.js';
export { leafBacOf, pruneLinks } from './application/plan-content.store.js';
export { type CbsNode, type LinkNode, type PlanNode, planNodeOf } from './domain/plan-node.js';
export {
  COST_TYPES,
  type CostType,
  type MeasurementMethod,
  type PlanVersion,
  type PlanVersionKind,
  type PlanVersionSource,
  PRICING_MODES,
  type PricingModeCode,
  type StoredStep,
} from './domain/plan.entities.js';

const ENTITIES = [PlanVersion, WbsItem, WbsItemPlan, CbsItem, CbsItemPlan, WbsCbsLink, WbsCbsLinkPlan, ScheduleChangeProposal];
export const PLANNING_ENTITIES = ENTITIES;
export const PLANNING_TENANT_ENTITIES = ENTITIES;
