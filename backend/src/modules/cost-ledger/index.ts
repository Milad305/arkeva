// API عمومی ماژول cost-ledger (docs/backend/03 ۵).
import { CostEntry, CostImportBatch } from './domain/cost.entities.js';

export { CostLedgerModule } from './cost-ledger.module.js';
export { CostEntries } from './application/cost-entries.js';

const ENTITIES = [CostEntry, CostImportBatch];
export const COST_LEDGER_ENTITIES = ENTITIES;
export const COST_LEDGER_TENANT_ENTITIES = ENTITIES;
