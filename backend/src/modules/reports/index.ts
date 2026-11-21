// API عمومی ماژول reports (docs/backend/03 ۵).
import { GeneratedReport, ReportSchedule, ReportTemplate } from './domain/report.entities.js';

export { ReportsModule } from './reports.module.js';
export { PdfRenderer } from './infrastructure/pdf-renderer.js';

const ENTITIES = [ReportTemplate, GeneratedReport, ReportSchedule];
export const REPORTS_ENTITIES = ENTITIES;
export const REPORTS_TENANT_ENTITIES = ENTITIES;
