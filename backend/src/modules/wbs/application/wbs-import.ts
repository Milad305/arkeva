import { Injectable } from '@nestjs/common';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError } from '../../../platform/http/errors.js';
import { IMPORT_MAX_BYTES, ImportFileError, type ParsedImport, parseWbsCsv } from '../domain/csv-import.js';
import { NO_REPORTS } from '../domain/ops.js';
import { renumber, toForest, walk } from '../domain/tree.js';
import { WbsDraftService } from './wbs-draft.service.js';

// W39 — ورود WBS از فایل به نسخهٔ کاری (wbs.md ۶.۲): پیش‌نمایش و گزارش اعتبارسنجی، سپس تأیید با همان فایل.
// فقط CSV UTF-8 (تصمیم کاربر 1405/08/23)؛ فایل در حافظه خوانده می‌شود و ذخیره نمی‌شود.

export interface UploadedCsv {
  readonly originalname: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface ImportInput {
  readonly file: UploadedCsv | undefined;
  readonly mode: 'replace' | 'append';
  readonly parentId: string | null;
  readonly draftRevision: number;
}

@Injectable()
export class WbsImport {
  constructor(private readonly drafts: WbsDraftService) {}

  /** `POST /projects/:pid/plan-draft/wbs/import/preview` */
  async preview(projectId: string, input: ImportInput) {
    const { parsed, file } = await this.parse(projectId, input);
    return {
      fileName: file.originalname,
      fileSize: file.size,
      mode: input.mode,
      parentId: input.parentId,
      rows: parsed.rows,
      totalRows: parsed.totalRows,
      importCount: parsed.importCount,
      issues: parsed.issues,
    };
  }

  /** `POST /projects/:pid/plan-draft/wbs/import/confirm` — ردیف‌های بی‌خطا وارد نسخهٔ کاری می‌شوند. */
  async confirm(projectId: string, input: ImportInput): Promise<{ importCount: number; firstId: string | null }> {
    const { parsed, state } = await this.parse(projectId, input);
    if (parsed.importCount === 0) throw new DomainError('WBS_IMPORT_INVALID', 422, { reason: 'هیچ ردیف قابل ورودی در فایل نیست.' });
    walk(parsed.forest, (node) => {
      node.id = newId();
    });

    let forest = toForest(state.nodes);
    if (input.mode === 'replace') forest = parsed.forest;
    else if (!input.parentId) forest.push(...parsed.forest);
    else {
      const parent = this.drafts.locateTarget(forest, input.parentId);
      if (parent.children.length === 0) {
        if (NO_REPORTS.hasApproved(parent.id) || NO_REPORTS.hasPending(parent.id)) {
          throw new ConflictError('WBS_IMPORT_NOT_ALLOWED', {
            reason: 'آیتم مقصد برگ دارای گزارش است و فرزند نمی‌گیرد؛ آیتم دیگری انتخاب کنید یا اول آن را «تقسیم» کنید.',
          });
        }
        // برگ ← والد: داده‌های خاص برگ پاک می‌شوند (wbs.md ۵.۶)
        Object.assign(parent, { method: null, unit: null, qty: null, steps: null, start: null, finish: null, isMilestone: false });
      }
      parent.children.push(...parsed.forest);
    }
    if (input.mode === 'append') renumber(forest);
    await this.drafts.store(state, forest, parsed.importCount, input.draftRevision);
    return { importCount: parsed.importCount, firstId: parsed.forest[0]?.id ?? null };
  }

  private async parse(
    projectId: string,
    input: ImportInput,
  ): Promise<{ parsed: ParsedImport; file: UploadedCsv; state: Awaited<ReturnType<WbsDraftService['editable']>> }> {
    const state = await this.drafts.editable(projectId);
    const project = state.project;
    if (project.mspLinked) {
      throw new ConflictError('WBS_IMPORT_NOT_ALLOWED', {
        reason: 'این پروژه به MSP متصل است و مالک ساختارش MSP است؛ ساختار را از فایل وارد نکنید (wbs.md ۶.۲).',
      });
    }
    if (input.mode === 'replace' && project.status !== 'draft') {
      throw new ConflictError('WBS_IMPORT_NOT_ALLOWED', {
        reason: 'جایگزینی کامل فقط در پروژهٔ پیش‌نویس است؛ در پروژهٔ فعال ردیف‌ها زیر یک آیتم افزوده می‌شوند.',
      });
    }
    const file = input.file;
    if (!file) throw new DomainError('WBS_IMPORT_INVALID', 422, { reason: 'فایلی نرسید. فایل CSV را دوباره انتخاب کنید.' });
    if (/\.(xml|mpp)$/i.test(file.originalname))
      throw new DomainError('WBS_IMPORT_INVALID', 422, { reason: 'فایل MSP (XML یا MPP) از مسیر «ورود از MSP» وارد می‌شود، نه اینجا.' });
    if (file.size > IMPORT_MAX_BYTES)
      throw new DomainError('WBS_IMPORT_INVALID', 413, { reason: 'حجم فایل بیش از ۲۰ مگابایت است. فایل را کوچک‌تر کنید یا با پشتیبانی تماس بگیرید.' });
    if (/\.xlsx?$/i.test(file.originalname)) {
      throw new DomainError('WBS_IMPORT_INVALID', 422, {
        reason: 'فایل Excel مستقیم خوانده نمی‌شود. «دانلود قالب» را بزنید، در Excel پر کنید و با قالب «CSV UTF-8» ذخیره کنید.',
      });
    }
    this.drafts.checkRevision(state, input.draftRevision);
    try {
      return { parsed: parseWbsCsv(file.buffer.toString('utf8'), input.mode), file, state };
    } catch (error) {
      if (error instanceof ImportFileError) throw new DomainError('WBS_IMPORT_INVALID', 422, { reason: error.message });
      throw error;
    }
  }
}
