import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ProjectTemplates } from '../projects/index.js';
import { TemplatesController } from './api/templates.controller.js';
import { TemplateIntake } from './application/template-intake.js';
import { TemplateLibrary } from './application/template-library.js';
import { TemplateStore } from './application/template-store.js';
import { WizardTemplates } from './application/wizard-templates.js';

// F16 — قالب‌ها (templates.md): Template و TemplateVersion (`03` ۲). سراسری چون ویزارد ساخت پروژه (projects) از درگاه
// ProjectTemplates آن را صدا می‌زند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [TemplatesController],
  providers: [TemplateStore, TemplateLibrary, TemplateIntake, WizardTemplates, { provide: ProjectTemplates, useExisting: WizardTemplates }],
  exports: [ProjectTemplates],
})
export class TemplatesModule {}
