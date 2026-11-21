// API عمومی ماژول backups (docs/backend/03 ۵؛ F20 ۱۲).
import { BackupSchedule, ProjectBackup, ProjectExport } from './domain/backup.entities.js';

export { BackupsModule } from './backups.module.js';
export { openBackup } from './domain/backup-crypto.js';

const ENTITIES = [BackupSchedule, ProjectBackup, ProjectExport];
export const BACKUPS_ENTITIES = ENTITIES;
export const BACKUPS_TENANT_ENTITIES = ENTITIES;
