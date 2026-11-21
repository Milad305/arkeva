import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type IntegrationCardView, type ProjectIntegrationCards } from '../../projects/index.js';
import { IntegrationConnection } from '../domain/integration.entities.js';

// کارت‌های یکپارچه‌سازی W30 (integrations.md ۸، ۹): MSP از اتصال واقعی F15، ERP و حسابداری «به‌زودی» تا اتصالی ساخته شود،
// P6 «فقط خروجی» با دکمهٔ «دریافت XER».

const SOON = 'به‌زودی — اتصال واقعی در فاز بعد (F19)';

@Injectable()
export class IntegrationCards implements ProjectIntegrationCards {
  constructor(private readonly em: EntityManager) {}

  private async card(projectId: string, system: 'erp' | 'accounting'): Promise<Pick<IntegrationCardView, 'status' | 'message'>> {
    const connection = await this.em.findOne(IntegrationConnection, { system, $or: [{ projectId }, { projectId: null }] }, { orderBy: { projectId: 'asc' } });
    if (connection?.status === 'connected') return { status: 'connected', message: connection.lastRunAt ? 'متصل' : 'متصل · هنوز همگام‌سازی نشده' };
    return { status: 'soon', message: SOON };
  }

  async cards(projectId: string, mspLinked: boolean): Promise<IntegrationCardView[]> {
    const [erp, accounting] = await Promise.all([this.card(projectId, 'erp'), this.card(projectId, 'accounting')]);
    return [
      {
        key: 'msp',
        title: 'Microsoft Project',
        description: 'همگام‌سازی WBS، زمان‌بندی و پیشرفت تأییدشده (XML)',
        status: mspLinked ? 'connected' : 'not_linked',
        message: mspLinked ? 'متصل · همگام‌سازی از صفحهٔ MSP' : 'هنوز به فایل MSP متصل نیست؛ با «ورود از MSP» وصل می‌شود',
      },
      { key: 'erp', title: 'ERP داخلی شرکت', description: 'هزینهٔ واقعی CBS و حقوق و دستمزد', ...erp },
      { key: 'accounting', title: 'نرم‌افزار حسابداری', description: 'ردیف‌های هزینه از اسناد حسابداری', ...accounting },
      {
        key: 'p6',
        title: 'Primavera P6',
        description: 'خروجی برنامه به قالب XER از نسخهٔ جاری',
        status: 'export_only',
        message: 'فقط خروجی · هیچ داده‌ای از P6 برنمی‌گردد',
      },
    ];
  }
}
