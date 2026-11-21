import { Injectable } from '@nestjs/common';
import { AppContext } from '../../../platform/context/app-context.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectBasicsCatalog, ProjectRules } from '../../projects/index.js';
import { ApprovalRoutes } from '../../team/index.js';
import { IMPORT_MAX_BYTES, type UploadedCsv } from '../../wbs/index.js';
import { captureContent } from '../domain/capture.js';
import { parseTemplateCsv, TemplateFileError } from '../domain/csv.js';
import { templateInvalid, TemplateStore } from './template-store.js';

// ساخت قالب پیش‌نویس (templates.md ۵.۱): از فایل (W31، دو CSV) و «ذخیره به‌عنوان قالب» از برنامهٔ جاری پروژه (AC-TP-07).

@Injectable()
export class TemplateIntake {
  constructor(
    private readonly context: AppContext,
    private readonly store: TemplateStore,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
    private readonly routes: ApprovalRoutes,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  private text(file: UploadedCsv | undefined, label: string): string | null {
    if (!file) return null;
    if (/\.xlsx?$/i.test(file.originalname)) {
      throw templateInvalid(`فایل Excel مستقیم خوانده نمی‌شود. «دانلود قالب» را بزنید، در Excel پر کنید و برگهٔ ${label} را با قالب «CSV UTF-8» ذخیره کنید.`);
    }
    if (file.size > IMPORT_MAX_BYTES) throw templateInvalid('حجم فایل بیش از ۲۰ مگابایت است. فایل را کوچک‌تر کنید.');
    return file.buffer.toString('utf8');
  }

  /** `POST /templates/import?commit=` — پیش‌نمایش؛ با commit قالب پیش‌نویس ساخته می‌شود. */
  async importFiles(input: {
    readonly name: string;
    readonly projectTypeId: string;
    readonly referenceDurationWd: number;
    readonly wbsFile: UploadedCsv | undefined;
    readonly cbsFile: UploadedCsv | undefined;
    readonly commit: boolean;
  }) {
    const name = (input.name ?? '').trim();
    if (name.length < 3 || name.length > 200) throw templateInvalid('نام قالب دست‌کم سه نویسه باشد.');
    await this.store.assertNameFree(name);
    await this.store.assertProjectType(input.projectTypeId);
    const wbsText = this.text(input.wbsFile, 'WBS');
    if (wbsText === null) throw templateInvalid('برگهٔ WBS نرسید. فایل CSV را دوباره انتخاب کنید.');
    let parsed;
    try {
      parsed = parseTemplateCsv(wbsText, this.text(input.cbsFile, 'CBS'), input.referenceDurationWd);
    } catch (error) {
      if (error instanceof TemplateFileError) throw templateInvalid(error.message);
      throw error;
    }
    const result = {
      wbsRows: parsed.wbsRows,
      cbsRows: parsed.cbsRows,
      issues: parsed.issues,
      wbsCount: parsed.content.wbs.length,
      cbsCount: parsed.content.cbs.length,
      linkCount: parsed.content.links.length,
      cbsShareSum: parsed.cbsShareSum,
      templateId: null as string | null,
    };
    if (!input.commit) return result;
    if (parsed.issues.some((issue) => issue.severity === 'error'))
      throw templateInvalid('تا خطاهای فایل درست نشود قالب ساخته نمی‌شود.', { issues: parsed.issues });
    const templateId = await this.store.createDraft({
      name,
      projectTypeId: input.projectTypeId,
      originNote: `وارد‌شده از فایل ${input.wbsFile?.originalname ?? ''}`.trim(),
      content: parsed.content,
    });
    return { ...result, templateId };
  }

  /** `POST /templates/from-project {projectId, name}` — بی سرپرست، مقدار کل و تاریخ مطلق (AC-TP-07). */
  async fromProject(input: { readonly projectId: string; readonly name: string }) {
    const access = this.context.access;
    if (!access?.isOrgAdmin && !access?.projects.get(input.projectId)?.has('wbs.view')) throw new NotFoundError('PROJECT_NOT_FOUND');
    const [current, rules, areas, [card]] = await Promise.all([
      this.planning.currentContent(input.projectId),
      this.rules.of(input.projectId),
      this.routes.areasOf(input.projectId),
      this.catalog.cards([input.projectId]),
    ]);
    if (!card) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (current.wbs.length === 0) throw templateInvalid('این پروژه هنوز ساختار WBS ندارد؛ چیزی برای ذخیره به‌عنوان قالب نیست.');
    const content = captureContent({
      wbs: current.wbs,
      cbs: current.cbs,
      links: current.links,
      calendar: rules.calendar,
      areas,
      settings: {
        weightGenerator: rules.progress.weightGenerator,
        warningThreshold: rules.progress.warningThreshold,
        criticalThreshold: rules.progress.criticalThreshold,
        eacMethod: rules.progress.eacMethod,
        minPhotos: rules.workflow.minPhotos,
        maxJumpPct: rules.workflow.maxJumpPct,
        allowDecrease: rules.workflow.allowDecrease,
        approvalMode: rules.workflow.approvalMode,
        stage2OnCritical: rules.workflow.stage2OnCritical,
        stage2OnJump: rules.workflow.stage2OnJump,
        stage2OnGpsOut: rules.workflow.stage2OnGpsOut,
        stage2OnCriticalPath: rules.workflow.stage2OnCriticalPath,
        reviewDeadlineHours: rules.reviewDeadlineHours,
        onDeadline: rules.onDeadline,
        autoApproveEnabled: rules.workflow.autoApproveEnabled,
        autoApproveMaxDelta: rules.workflow.autoApproveMaxDelta,
      },
    });
    const templateId = await this.store.createDraft({
      name: input.name,
      projectTypeId: card.projectTypeId,
      originNote: `ساخته‌شده از پروژهٔ ${card.name}`,
      content,
    });
    return this.store.detail(templateId);
  }
}
