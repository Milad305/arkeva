import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Alert } from '../domain/alert.entities.js';

// متن هشدار برای اعلان (F13؛ 04-alert-engine ۵) — بی وابستگی به ماژول دامنهٔ دیگر تا notifications بی چرخه بخواندش.
// رویداد AlertRaised فقط شناسه دارد (08 ۲)؛ متن با و بی مبلغ از اینجا خوانده می‌شود.

export interface AlertText {
  readonly id: string;
  readonly projectId: string | null;
  readonly ruleCode: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly title: string;
  readonly guidance: string;
  readonly guidanceSafe: string;
  readonly link: string;
}

@Injectable()
export class AlertTexts {
  constructor(private readonly em: EntityManager) {}

  async get(alertId: string, em: EntityManager = this.em): Promise<AlertText | null> {
    const alert = await em.findOne(Alert, { id: alertId });
    if (!alert) return null;
    return {
      id: alert.id,
      projectId: alert.projectId ?? null,
      ruleCode: alert.ruleCode,
      severity: alert.severity,
      title: alert.title,
      guidance: alert.guidance,
      guidanceSafe: alert.guidanceSafe,
      link: alert.projectId ? `/projects/${alert.projectId}${alert.actionLink}` : alert.actionLink,
    };
  }
}
