import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// جای `import/no-cycle` بی وابستگی (برش ۲۰؛ تصمیم 1405/08/27): گراف import زمان اجرا میان ماژول‌های `src/modules` (import فقط‌نوعی
// حساب نمی‌شود) چرخهٔ تازه نمی‌سازد؛ وابستگی وارونه با درگاه (کلاس انتزاعی در ماژول پایین‌دست) حل می‌شود (03 ۵).

const MODULES = dirname(fileURLToPath(import.meta.url));

/**
 * یال‌های درون چرخهٔ موجود هنگام روشن کردن این تست (1405/08/27؛ code-mapping ۳.۵.۵۹). یال تازه درون چرخه رد می‌شود؛ یالی که
 * از چرخه بیرون رفت باید از این فهرست هم برداشته شود (فقط کوچک می‌شود). شکستن این‌ها کار جداست (§۷.۲).
 */
const CYCLE_BASELINE: ReadonlySet<string> = new Set([
  'alerts>approvals',
  'alerts>computation',
  'alerts>field',
  'alerts>msp',
  'alerts>notifications',
  'alerts>planning',
  'alerts>projects',
  'alerts>risks',
  'alerts>team',
  'approvals>computation',
  'approvals>field',
  'approvals>notifications',
  'approvals>planning',
  'approvals>projects',
  'approvals>team',
  'computation>cost-ledger',
  'computation>field',
  'computation>planning',
  'computation>projects',
  'cost-ledger>computation',
  'cost-ledger>planning',
  'cost-ledger>projects',
  'cost-ledger>wbs',
  'field>computation',
  'field>planning',
  'field>projects',
  'msp>computation',
  'msp>field',
  'msp>planning',
  'msp>projects',
  'msp>team',
  'msp>wbs',
  'notifications>alerts',
  'notifications>projects',
  'planning>computation',
  'planning>projects',
  'planning>team',
  'projects>computation',
  'projects>team',
  'risks>computation',
  'risks>notifications',
  'risks>planning',
  'risks>projects',
  'team>computation',
  'team>notifications',
  'wbs>computation',
  'wbs>planning',
  'wbs>projects',
]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const moduleOf = (path: string): string | null => {
  const rel = relative(MODULES, path);
  return rel.startsWith('..') || !rel.includes(sep) ? null : (rel.split(sep)[0] ?? null);
};

/** importهای زمان اجرا: `import type` و `import { type A, type B }` کنار می‌روند. */
function runtimeImports(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/^\s*(import|export)\s+([^'";]*?)\s+from\s+'([^']+)'/gms)) {
    const clause = (match[2] ?? '').trim();
    if (clause.startsWith('type ')) continue;
    const names = /^\{([^}]*)\}$/.exec(clause)?.[1];
    if (names !== undefined && names.split(',').every((name) => !name.trim() || name.trim().startsWith('type '))) continue;
    out.push(match[3] ?? '');
  }
  return out;
}

export function moduleGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const file of files(MODULES)) {
    const from = moduleOf(file);
    if (!from) continue;
    const edges = graph.get(from) ?? new Set<string>();
    graph.set(from, edges);
    for (const target of runtimeImports(readFileSync(file, 'utf8'))) {
      if (!target.startsWith('.')) continue;
      const to = moduleOf(resolve(dirname(file), target));
      if (to && to !== from) edges.add(to);
    }
  }
  return graph;
}

/** مؤلفه‌های قویاً همبند با بیش از یک ماژول (Tarjan). */
export function cycles(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  let index = 0;
  const order = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const found: string[][] = [];
  const visit = (node: string): void => {
    order.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!order.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) low.set(node, Math.min(low.get(node) ?? 0, order.get(next) ?? 0));
    }
    if (low.get(node) !== order.get(node)) return;
    const component: string[] = [];
    for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1) found.push(component.sort());
  };
  for (const node of [...graph.keys()].sort()) if (!order.has(node)) visit(node);
  return found;
}

describe('گراف ماژول‌ها', () => {
  it('Tarjan چرخه را پیدا می‌کند', () => {
    const graph = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set(['a'])],
      ['d', new Set(['a'])],
    ]);
    expect(cycles(graph)).toEqual([['a', 'b', 'c']]);
  });

  it('import زمان اجرا میان ماژول‌ها چرخهٔ تازه نمی‌سازد', () => {
    const graph = moduleGraph();
    const members = new Map(cycles(graph).flatMap((component, at) => component.map((name) => [name, at] as const)));
    const inCycle: string[] = [];
    for (const [from, targets] of graph) {
      for (const to of targets) if (members.has(from) && members.get(from) === members.get(to)) inCycle.push(`${from}>${to}`);
    }
    expect(inCycle.filter((edge) => !CYCLE_BASELINE.has(edge)).sort()).toEqual([]);
    expect([...CYCLE_BASELINE].filter((edge) => !inCycle.includes(edge))).toEqual([]);
  });
});
