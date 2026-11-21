// API عمومی ماژول msp (docs/backend/03 ۵).
import { ExternalIdMap, FieldMappingTemplate, MspImportSession, MspLink, MspSyncChange, MspSyncSession, ProgressExportItem } from './domain/msp.entities.js';

export { MspModule } from './msp.module.js';
export { ProgressExport } from './application/progress-export.js';

const ENTITIES = [MspImportSession, FieldMappingTemplate, MspLink, ExternalIdMap, MspSyncSession, MspSyncChange, ProgressExportItem];
export const MSP_ENTITIES = ENTITIES;
export const MSP_TENANT_ENTITIES = ENTITIES;
