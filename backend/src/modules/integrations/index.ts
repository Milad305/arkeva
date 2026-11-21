// API عمومی ماژول integrations (docs/backend/03 ۵؛ F19).
import { IntegrationConnection } from './domain/integration.entities.js';

export { IntegrationsModule } from './integrations.module.js';
export type { ExternalCostRow, IntegrationConnector, IntegrationSystem, PullResult } from './domain/connector.js';

const ENTITIES = [IntegrationConnection];
export const INTEGRATIONS_ENTITIES = ENTITIES;
export const INTEGRATIONS_TENANT_ENTITIES = ENTITIES;
