import type { Permission, ProjectStatus } from '@projeyar/shared';
import { describe, expect, it } from 'vitest';
import { toMermaid, type TransitionContext } from '../../../platform/workflow/machine.js';
import { projectMachine } from './project-status.machine.js';
import { Project } from './project.entity.js';

// ماشین حالت پروژه (`02` ۳؛ F02 ۸؛ docs/backend/08 ۶): هر انتقال مجاز، هر انتقال غیرمجاز، دسترسی و دلیل.

const NOW = new Date('2026-11-14T08:00:00Z');

function projectIn(status: ProjectStatus): Project {
  const project = new Project();
  project.status = status;
  return project;
}

const ctx = (permissions: Permission[] | 'all', reason?: string): TransitionContext => ({
  permissions: permissions === 'all' ? 'all' : new Set(permissions),
  reason: reason ?? null,
  now: NOW,
});

describe('F02 ۸ — انتقال‌های مجاز', () => {
  it.each([
    ['active', 'pause', 'paused', 'project.pause'],
    ['paused', 'resume', 'active', 'project.pause'],
    ['active', 'complete', 'completed', 'project.complete'],
    ['completed', 'archive', 'archived', 'project.archive'],
    ['paused', 'archive', 'archived', 'project.archive'],
    ['archived', 'restore', 'active', 'project.restore'],
    ['completed', 'reopen', 'active', 'project.restore'],
  ] as const)('F02 ۸ — %s با %s به %s', (from, action, to, permission) => {
    const project = projectIn(from);
    const applied = projectMachine.apply(project, action, ctx([permission], 'دلیل آزمایشی'));
    expect(applied).toEqual({ action, from, to });
    expect(project.status).toBe(to);
  });

  it('F02 ۸.۲ — توقف لحظه را ثبت و ادامه پاکش می‌کند', () => {
    const project = projectIn('active');
    projectMachine.apply(project, 'pause', ctx('all'));
    expect(project.pausedAt).toEqual(NOW);
    projectMachine.apply(project, 'resume', ctx('all'));
    expect(project.pausedAt).toBeNull();
  });

  it('F02 ۸.۳ — بایگانی پروژهٔ تمام‌شده تاریخ پایان را نگه می‌دارد؛ بازگشت از پایان پاکش می‌کند', () => {
    const archived = projectIn('active');
    projectMachine.apply(archived, 'complete', ctx('all', 'پایان'));
    projectMachine.apply(archived, 'archive', ctx('all', 'بایگانی'));
    expect(archived.completedAt).toEqual(NOW);
    expect(archived.archivedAt).toEqual(NOW);

    const reopened = projectIn('active');
    projectMachine.apply(reopened, 'complete', ctx('all', 'پایان'));
    projectMachine.apply(reopened, 'reopen', ctx('all', 'اشتباه'));
    expect(reopened.completedAt).toBeNull();
  });
});

describe('F02 ۸ — انتقال‌های ناممکن', () => {
  it.each([
    ['draft', 'pause'],
    ['active', 'activate'],
    ['paused', 'activate'],
    ['paused', 'pause'],
    ['active', 'resume'],
    ['paused', 'complete'],
    ['active', 'archive'],
    ['active', 'restore'],
    ['archived', 'pause'],
    ['archived', 'reopen'],
    ['completed', 'resume'],
  ] as const)('F02 ۸ — از %s انتقال %s رد می‌شود (۴۰۹)', (from, action) => {
    const project = projectIn(from);
    expect(() => projectMachine.apply(project, action, ctx('all', 'دلیل'))).toThrow(expect.objectContaining({ code: 'TRANSITION_NOT_ALLOWED', status: 409 }));
    expect(project.status).toBe(from);
  });

  it('AC-PS-11 — از بایگانی فقط بازگردانی ممکن است', () => {
    expect(projectMachine.available(projectIn('archived'), ctx('all'))).toEqual(['restore']);
  });

  it('access-control ۵.۴ — بی کد دسترسی ۴۰۳ با نام کد لازم', () => {
    const project = projectIn('archived');
    expect(() => projectMachine.apply(project, 'restore', ctx(['project.pause']))).toThrow(
      expect.objectContaining({ code: 'PERMISSION_DENIED', details: { requiredPermission: 'project.restore' } }),
    );
  });

  it('F02 ۸.۳ — پایان، بایگانی و بازگشت از پایان بی دلیل رد می‌شوند', () => {
    for (const [from, action] of [
      ['active', 'complete'],
      ['paused', 'archive'],
      ['completed', 'reopen'],
    ] as const) {
      expect(() => projectMachine.apply(projectIn(from), action, ctx('all', '   '))).toThrow(expect.objectContaining({ code: 'REASON_REQUIRED' }));
    }
  });
});

describe('docs/backend/08 ۶ — نمودار از تعریف', () => {
  it('08 ۶ — نمودار mermaid همهٔ انتقال‌ها را با کد دسترسی دارد', () => {
    const diagram = toMermaid(projectMachine.def);
    expect(diagram).toContain('[*] --> draft');
    expect(diagram).toContain('completed --> active: بازگشت از پایان (project.restore)');
    expect(diagram).toContain('draft --> active: فعال‌سازی (project.activate)');
    expect(diagram.split('\n')).toHaveLength(2 + 8); // ۸ یال: فعال‌سازی، توقف، ادامه، پایان، دو بایگانی، بازگردانی، بازگشت از پایان
  });
});
