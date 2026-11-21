import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { FieldAppController } from './api/field-app.controller.js';
import { AppIssues } from './application/app-issues.js';
import { AppReports } from './application/app-reports.js';
import { AppSync } from './application/app-sync.js';

// API اپ کارگاه (F08 سمت سرور؛ field-app.md ۵). ماژول ترکیبی `[پیش‌فرض فنی]`: از field، approvals، team، planning و projects
// می‌خواند و فقط از راه FieldIntake، SiteIssues و DeviceHeartbeats (مالک F08) و RiskIntake (F14) می‌نویسد — تا field به approvals و team وابسته نشود.
@Module({
  imports: [IdentityModule],
  controllers: [FieldAppController],
  providers: [AppSync, AppReports, AppIssues],
})
export class FieldAppModule {}
