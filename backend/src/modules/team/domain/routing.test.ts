import { describe, expect, it } from 'vitest';
import {
  assignableLeavesBelow,
  assignableReason,
  firstStageApprover,
  imbalanced,
  NOT_LEAF,
  routeOf,
  secondStageApprover,
  TIME_BASED,
  type TeamPlanItem,
} from './routing.js';

// قواعد خالص تخصیص و مسیریابی (team-assignment.md ۵.۱، ۶.۱، ۶.۲).

const node = (id: string, parentId: string | null, isLeaf = true, measurementMethod: string | null = 'percent'): TeamPlanItem => ({
  id,
  parentId,
  code: id,
  title: id,
  sortOrder: 0,
  isLeaf,
  isMilestone: false,
  measurementMethod: isLeaf ? measurementMethod : null,
  supervisorUserId: null,
});

// مثال ۶.۱: «سازه» 1.2 و «تأسیسات سقف» 1.2.3.4
const tree = [
  node('1', null, false),
  node('1.2', '1', false),
  node('1.2.1', '1.2', false),
  node('1.2.1.1', '1.2.1'),
  node('1.2.3', '1.2', false),
  node('1.2.3.4', '1.2.3', false),
  node('1.2.3.4.1', '1.2.3.4', true, 'time_based'),
  node('1.2.3.4.2', '1.2.3.4'),
  node('1.3', '1'),
];
const routes = [
  { id: 'structure', rootItemIds: ['1.2'], reviewerUserId: 'hosseini' },
  { id: 'roof', rootItemIds: ['1.2.3.4'], reviewerUserId: 'kazemi' },
];

describe('تخصیص', () => {
  it('AC-TM-01 — والد و برگ زمانی سرپرست نمی‌گیرند', () => {
    expect(assignableReason(node('p', null, false))).toBe(NOT_LEAF);
    expect(assignableReason(node('t', null, true, 'time_based'))).toBe(TIME_BASED);
    expect(assignableReason(node('l', null))).toBeNull();
  });

  it('AC-TM-02 — انتخاب والد دقیقاً همهٔ برگ‌های فعال غیرزمانی زیردرخت', () => {
    expect(assignableLeavesBelow(tree, ['1.2']).sort()).toEqual(['1.2.1.1', '1.2.3.4.2']);
    expect(assignableLeavesBelow(tree, ['1', '1.3']).sort()).toEqual(['1.2.1.1', '1.2.3.4.2', '1.3']);
  });

  it('AL-RES-01 — بیش از ۲ برابر میانگین', () => {
    expect(imbalanced(9, 4)).toBe(true);
    expect(imbalanced(8, 4)).toBe(false);
    expect(imbalanced(1, 0)).toBe(false);
  });
});

describe('مسیریابی تأیید', () => {
  it('AC-TM-03 — حوزهٔ دقیق‌تر برنده است: 1.2.3.4.2 به کاظمی و 1.2.1.1 به حسینی', () => {
    expect(routeOf(tree, routes, '1.2.3.4.2')?.reviewerUserId).toBe('kazemi');
    expect(routeOf(tree, routes, '1.2.1.1')?.reviewerUserId).toBe('hosseini');
    expect(routeOf(tree, routes, '1.3')).toBeNull();
  });

  it('AC-TM-04 — منع خودتأییدی: نویسنده‌ای که ناظر حوزه است ← جایگزین؛ اگر جایگزین هم خودش ← مدیر پروژه', () => {
    expect(firstStageApprover({ routeReviewer: 'kazemi', alternate: 'rezaei', manager: 'ahmadi', author: 'sup' })).toBe('kazemi');
    expect(firstStageApprover({ routeReviewer: 'kazemi', alternate: 'rezaei', manager: 'ahmadi', author: 'kazemi' })).toBe('rezaei');
    expect(firstStageApprover({ routeReviewer: 'kazemi', alternate: 'kazemi', manager: 'ahmadi', author: 'kazemi' })).toBe('ahmadi');
    expect(firstStageApprover({ routeReviewer: null, alternate: 'ahmadi', manager: 'ahmadi', author: 'ahmadi' })).toBeNull();
    // بی‌حوزه ← جایگزین
    expect(firstStageApprover({ routeReviewer: null, alternate: 'rezaei', manager: 'ahmadi', author: 'sup' })).toBe('rezaei');
  });

  it('۶.۲ — مرحلهٔ دوم مدیر پروژه؛ اگر نویسنده مدیر پروژه است، جایگزین', () => {
    expect(secondStageApprover({ alternate: 'rezaei', manager: 'ahmadi', author: 'sup' })).toBe('ahmadi');
    expect(secondStageApprover({ alternate: 'rezaei', manager: 'ahmadi', author: 'ahmadi' })).toBe('rezaei');
  });
});
