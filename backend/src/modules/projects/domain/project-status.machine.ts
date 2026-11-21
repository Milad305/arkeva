import type { ProjectStatus } from '@projeyar/shared';
import { defineMachine, type TransitionContext } from '../../../platform/workflow/machine.js';
import type { Project } from './project.entity.js';

// ماشین حالت پروژه (`02` ۳؛ F02 ۸؛ docs/backend/08 ۶.۲). فعال‌سازی (draft ← active) مبنا را هم اعمال می‌کند
// (F04)؛ حذف وضعیت نیست و با مهلت روی خود پروژه ثبت می‌شود (F02 ۸.۴).

export const PROJECT_ACTIONS = ['activate', 'pause', 'resume', 'complete', 'archive', 'restore', 'reopen'] as const;
export type ProjectAction = (typeof PROJECT_ACTIONS)[number];

export const projectMachine = defineMachine<ProjectStatus, ProjectAction, Project, TransitionContext>({
  name: 'Project',
  states: ['draft', 'active', 'paused', 'completed', 'archived'],
  initial: 'draft',
  status: (project) => project.status,
  setStatus: (project, to, ctx) => project.markStatus(to, ctx.now),
  transitions: {
    // F02 ۸.۱: پیش‌شرط‌ها و ثبت مبنا را ProjectLifecycle.activate درون همان تراکنش می‌سنجد
    activate: { from: ['draft'], to: 'active', permission: 'project.activate', label: 'فعال‌سازی' },
    pause: { from: ['active'], to: 'paused', permission: 'project.pause', label: 'توقف' },
    resume: { from: ['paused'], to: 'active', permission: 'project.pause', label: 'ادامه' },
    complete: { from: ['active'], to: 'completed', permission: 'project.complete', requiresReason: true, label: 'اعلام پایان' },
    archive: { from: ['completed', 'paused'], to: 'archived', permission: 'project.archive', requiresReason: true, label: 'بایگانی' },
    restore: { from: ['archived'], to: 'active', permission: 'project.restore', label: 'بازگردانی' },
    // F02 ۸.۳: پایان اشتباهی را فقط مدیر سازمان با دلیل برمی‌گرداند (تصمیم کاربر 1405/08/22)
    reopen: { from: ['completed'], to: 'active', permission: 'project.restore', requiresReason: true, label: 'بازگشت از پایان' },
  },
});
