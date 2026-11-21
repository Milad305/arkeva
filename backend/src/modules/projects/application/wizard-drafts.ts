import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectWizardDraft } from '../domain/project-settings.entity.js';
import { ProjectType } from '../domain/project.entity.js';
import { normalizeCode } from '../domain/rules/project-code.js';
import type { WizardState } from '../domain/rules/wizard.js';
import type { ProjectListItemView } from './project-queries.js';

// پیش‌نویس ویزارد (F02 ۵.۵): ذخیرهٔ هر مرحله، ادامه از W07، فقط برای سازنده، پاک‌سازی پس از ۹۰ روز
// بی‌فعالیتی در PurgeTick. پیش‌نویس پروژه نیست؛ کد رزرو نمی‌کند.

export interface WizardDraftView extends WizardState {
  readonly id: string;
  readonly updatedAt: string;
}

@Injectable()
export class WizardDrafts {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly identity: IdentityService,
  ) {}

  async save(id: string | null, state: WizardState): Promise<WizardDraftView> {
    const actor = this.actor();
    const saved = await this.em.transactional(async (tx) => {
      if (id) {
        const draft = await tx.findOne(ProjectWizardDraft, { id, createdByUserId: actor.userId });
        if (!draft) throw new NotFoundError('WIZARD_DRAFT_NOT_FOUND');
        draft.state = { ...state };
        return draft;
      }
      return tx.create(ProjectWizardDraft, { id: newId(), orgId: actor.orgId, createdByUserId: actor.userId, state: { ...state } });
    });
    return this.view(saved);
  }

  async get(id: string): Promise<WizardDraftView> {
    return this.view(await this.load(id));
  }

  /** پیش‌نویس سازنده یا NotFound — برای ساخت و حذف. */
  async load(id: string): Promise<ProjectWizardDraft> {
    const draft = await this.em.findOne(ProjectWizardDraft, { id, createdByUserId: this.actor().userId });
    if (!draft) throw new NotFoundError('WIZARD_DRAFT_NOT_FOUND');
    return draft;
  }

  async delete(id: string): Promise<{ id: string }> {
    const actor = this.actor();
    await this.em.nativeDelete(ProjectWizardDraft, { id, createdByUserId: actor.userId });
    return { id };
  }

  /** ردیف‌های «ناتمام» W07 فقط برای سازنده (F02 ۵.۵). */
  async listRows(filter: { readonly q?: string }): Promise<ProjectListItemView[]> {
    const actor = this.context.actor;
    if (!actor) return [];
    const drafts = await this.em.find(ProjectWizardDraft, { createdByUserId: actor.userId }, { orderBy: { updatedAt: 'desc' } });
    if (drafts.length === 0) return [];
    const [types, people] = await Promise.all([this.em.find(ProjectType, {}), this.identity.personRefs([actor.userId])]);
    const typeNames = new Map(types.map((type) => [type.key, type.name]));
    const me = people.get(actor.userId) ?? { id: actor.userId, fullName: '—', avatarTone: 'a1' };
    const q = filter.q?.trim().toLowerCase();

    return drafts
      .map((draft) => {
        const state = draft.state as unknown as WizardState;
        return {
          id: draft.id,
          code: normalizeCode(state.basic.code) || '—',
          name: state.basic.name.trim() || 'پروژهٔ بی‌نام',
          clientName: state.basic.clientName.trim() || '—',
          projectTypeId: state.basic.projectTypeId ?? '',
          projectTypeName: state.basic.projectTypeId ? (typeNames.get(state.basic.projectTypeId) ?? '') : '—',
          status: 'draft' as const,
          manager: me,
          memberPreview: [me],
          memberCount: state.team.members.length + 1,
          plannedFinish: state.schedule.plannedFinish,
          mspLinked: false,
          progress: null,
          atRisk: false,
          wizardIncomplete: true,
        };
      })
      .filter((row) => !q || row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q));
  }

  private view(draft: ProjectWizardDraft): WizardDraftView {
    return { ...(draft.state as unknown as WizardState), id: draft.id, updatedAt: draft.updatedAt.toISOString() };
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
