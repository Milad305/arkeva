// API عمومی ماژول risks (docs/backend/03 ۵).
import { RISK_ENTITIES } from './domain/risk.entities.js';

export { RisksModule } from './risks.module.js';
export { levelOf as riskLevelOf } from './domain/risk-rules.js';
export { RiskCommands } from './application/risk-commands.js';
export { RiskViews } from './application/risk-views.js';
export { type RiskFact, RiskReads } from './application/risk-reads.js';
export { ISSUE_CATEGORY, type IssueForRisk, RiskIntake } from './application/risk-intake.js';

export const RISKS_ENTITIES = RISK_ENTITIES;
export const RISKS_TENANT_ENTITIES = RISK_ENTITIES;
