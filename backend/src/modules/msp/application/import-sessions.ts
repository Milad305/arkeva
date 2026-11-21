import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError } from '../../../platform/http/errors.js';
import { normalizeSearch } from '../../../platform/search/normalize.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { ProjectRules } from '../../projects/index.js';
import { buildChecks, leavesOf } from '../domain/checks.js';
import { buildMapping, TARGET_VALUES, TARGETS } from '../domain/mapping.js';
import { FieldMappingTemplate, MspImportSession, type ResourceRow, WEIGHT_GENERATORS } from '../domain/msp.entities.js';
import { MspFileError, readMspUpload } from '../domain/mspdi.js';
import { ImportViews } from './import-views.js';
import { MspAccess, mspConflict, mspInvalid } from './msp-access.js';

// جلسهٔ ورود MSP (W34، W35؛ msp-integration.md ۷.۱ گام ۱ و ۲): بارگذاری و تحلیل همان درخواست (تصمیم کاربر 1405/08/26)،
// اعتبارسنجی، نگاشت با الگوی سازمان، منابع ← سرپرستان همین پروژه، مولد وزن.

export interface UploadedFile {
  readonly originalname: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface ImportUpdate {
  readonly checkResolution?: { readonly checkId: string; readonly resolution: string };
  readonly options?: { readonly buildCbs?: boolean; readonly importBaseline?: boolean; readonly importProgress?: boolean };
  readonly mapping?: { readonly rowId: string; readonly target: string };
  readonly resource?: { readonly rowId: string; readonly userId: string | null; readonly action: 'match' | 'invite' | 'skip' };
  readonly weightGenerator?: string;
  readonly saveTemplate?: boolean;
}

@Injectable()
export class ImportSessions {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly storage: ObjectStorage,
    private readonly access: MspAccess,
    private readonly rules: ProjectRules,
    private readonly views: ImportViews,
  ) {}

  /** `POST /projects/:pid/msp/imports` — فقط پروژهٔ پیش‌نویس (W13). */
  async create(projectId: string, upload: UploadedFile | undefined) {
    const { actor } = this.access.actor();
    const project = await this.rules.of(projectId);
    if (project.status !== 'draft') throw mspConflict('ورود از MSP فقط برای پروژهٔ پیش‌نویس است. برای پروژهٔ فعال از «همگام‌سازی» استفاده کنید.');
    if (!upload) throw new DomainError('MSP_FILE_INVALID', 422, { reason: 'فایلی نرسید. فایل XML را دوباره انتخاب کنید.' });
    let file;
    try {
      file = readMspUpload(upload);
    } catch (error) {
      if (error instanceof MspFileError) throw new DomainError('MSP_FILE_INVALID', /حجم/.test(error.message) ? 413 : 422, { reason: error.message });
      throw error;
    }
    const template = await this.em.findOne(FieldMappingTemplate, { isDefault: true });
    const supervisors = await this.views.supervisors(projectId);
    const byName = new Map(supervisors.map((person) => [normalizeSearch(person.fullName).replace(/\s/g, ''), person.id]));
    const resources: ResourceRow[] = file.resources.map((name, index) => {
      const userId = byName.get(normalizeSearch(name).replace(/\s/g, '')) ?? null;
      return {
        id: `res-${index}`,
        name,
        taskCount: file.tasks.filter((task) => task.resourceNames.includes(name)).length,
        userId,
        action: userId ? 'match' : 'skip',
      };
    });
    const id = newId();
    const storageKey = fileKey(actor.orgId, projectId, 'import', id);
    // فایل اصلی دست‌نخورده نگه داشته می‌شود (۴)
    await this.storage.put(storageKey, upload.buffer, 'application/xml');
    const leaves = leavesOf(file);
    const now = this.clock.now();
    const session = await this.em.transactional((tx) =>
      Promise.resolve(
        tx.create(MspImportSession, {
          id,
          orgId: actor.orgId,
          projectId,
          fileName: upload.originalname,
          storageKey,
          fileSize: upload.size,
          format: 'xml',
          status: 'validated',
          analysis: file,
          checks: buildChecks(file),
          options: { buildCbs: leaves.some((task) => task.cost > 0), importBaseline: true, importProgress: leaves.some((task) => task.percentComplete > 0) },
          mapping: buildMapping(file, template?.mappings ?? null),
          resourceMapping: resources,
          weightGenerator: leaves.some((task) => task.cost > 0) ? 'cost' : 'duration',
          saveTemplate: true,
          builtVersionId: null,
          builtAt: null,
          rollbackDeadline: null,
          previousContent: null,
          openingReportId: null,
          createdByUserId: actor.userId,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    return this.views.session(session);
  }

  async get(id: string) {
    return this.views.session(await this.access.session(id));
  }

  /** `PUT /msp/imports/:id/mapping` — همهٔ ویرایش‌های جلسه (تعیین تکلیف، گزینه‌ها، نگاشت، منابع، مولد وزن). */
  async update(id: string, input: ImportUpdate) {
    const session = await this.em.transactional((tx) => this.apply(tx, id, input));
    return this.views.session(session);
  }

  private async apply(tx: EntityManager, id: string, input: ImportUpdate): Promise<MspImportSession> {
    const session = await this.access.session(id, tx);
    if (session.status !== 'validated') throw mspConflict('این ورود ساخته یا بازگردانده شده است و دیگر تغییر نمی‌کند.');
    if (input.checkResolution) {
      const checks = session.checks.map((check) => ({ ...check }));
      const check = checks.find((entry) => entry.id === input.checkResolution?.checkId);
      if (!check || !check.resolutions.some((entry) => entry.id === input.checkResolution?.resolution)) throw mspInvalid('این تعیین تکلیف برای این مورد نیست.');
      check.resolution = input.checkResolution.resolution;
      session.checks = checks;
    }
    if (input.options) session.options = { ...session.options, ...input.options };
    if (input.mapping) {
      if (!TARGET_VALUES.includes(input.mapping.target)) throw mspInvalid('این فیلد پروژه‌یار شناخته نشد.');
      const rows = session.mapping.map((row) => ({ ...row }));
      const row = rows.find((entry) => entry.id === input.mapping?.rowId);
      if (!row) throw mspInvalid('این ستون در فایل نیست.');
      row.target = input.mapping.target;
      row.status = input.mapping.target === 'skip' ? 'skipped' : 'manual';
      session.mapping = rows;
    }
    if (input.resource) {
      const rows = session.resourceMapping.map((row) => ({ ...row }));
      const row = rows.find((entry) => entry.id === input.resource?.rowId);
      if (!row) throw mspInvalid('این منبع در فایل نیست.');
      if (input.resource.userId) {
        const allowed = (await this.views.supervisors(session.projectId)).some((person) => person.id === input.resource?.userId);
        if (!allowed) throw mspInvalid('فقط سرپرستان کارگاه همین پروژه انتخاب می‌شوند؛ نقش سرپرست را از «اعضا» بدهید.');
      }
      row.userId = input.resource.action === 'match' ? input.resource.userId : null;
      row.action = input.resource.action === 'match' && !input.resource.userId ? 'skip' : input.resource.action;
      session.resourceMapping = rows;
    }
    if (input.weightGenerator) {
      if (!(WEIGHT_GENERATORS as readonly string[]).includes(input.weightGenerator)) throw mspInvalid('مولد وزن «از مدت»، «از هزینه» یا «مساوی» است.');
      session.weightGenerator = input.weightGenerator as MspImportSession['weightGenerator'];
    }
    if (input.saveTemplate !== undefined) session.saveTemplate = input.saveTemplate;
    session.updatedAt = this.clock.now();
    return session;
  }

  /** `GET /org/msp-templates?projectId=` — فیلدها، سرپرستان پروژه و الگوهای سازمان (تصمیم کاربر 1405/08/26). */
  async options(projectId: string | null) {
    if (projectId) this.access.require(projectId, 'msp.import');
    const templates = await this.em.find(FieldMappingTemplate, {}, { orderBy: { isDefault: 'desc', name: 'asc' } });
    return {
      targets: TARGETS.map((target) => ({ ...target })),
      users: projectId ? await this.views.supervisors(projectId) : [],
      templates: templates.map((template) => ({ id: template.id, name: template.name })),
    };
  }

  async preview(id: string) {
    return this.views.preview(await this.access.session(id));
  }
}
