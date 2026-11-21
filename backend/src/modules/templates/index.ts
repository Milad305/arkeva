// API عمومی ماژول templates (docs/backend/03 ۵).
import { Template, TemplateVersion } from './domain/template.entities.js';

export { TemplatesModule } from './templates.module.js';

const ENTITIES = [Template, TemplateVersion];
export const TEMPLATES_ENTITIES = ENTITIES;
export const TEMPLATES_TENANT_ENTITIES = ENTITIES;
