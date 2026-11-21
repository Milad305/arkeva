import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDotEnv } from './config.js';

/** docs/backend/10 ۲ — بارگذاری env بر اساس پروفایل. */

const KEYS = ['NODE_ENV', 'PJ_TEST_A', 'PJ_TEST_B', 'PJ_TEST_C'] as const;
let dir: string;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pj-env-'));
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  rmSync(dir, { recursive: true, force: true });
});

describe('پروفایل env', () => {
  it('10 ۲ — بی NODE_ENV پروفایل development؛ ‎.local‎ بر پروفایل و پروفایل بر ‎.env‎ برنده است', () => {
    writeFileSync(join(dir, '.env'), 'PJ_TEST_A=base\nPJ_TEST_B=base\nPJ_TEST_C=base\n');
    writeFileSync(join(dir, '.env.development'), 'PJ_TEST_A=profile\nPJ_TEST_B=profile\n');
    writeFileSync(join(dir, '.env.development.local'), 'PJ_TEST_A=local\n');

    const result = loadDotEnv(dir);

    expect(result).toEqual({ profile: 'development', files: ['.env.development.local', '.env.development', '.env'] });
    expect([process.env['PJ_TEST_A'], process.env['PJ_TEST_B'], process.env['PJ_TEST_C']]).toEqual(['local', 'profile', 'base']);
  });

  it('10 ۲ — متغیر واقعی فرایند بر همهٔ فایل‌ها برنده است و production فایل توسعه را نمی‌خواند', () => {
    process.env['NODE_ENV'] = 'production';
    process.env['PJ_TEST_A'] = 'process';
    writeFileSync(join(dir, '.env.development'), 'PJ_TEST_A=dev\nPJ_TEST_B=dev\n');
    writeFileSync(join(dir, '.env.production'), 'PJ_TEST_A=prod\n');

    const result = loadDotEnv(dir);

    expect(result.files).toEqual(['.env.production']);
    expect(process.env['PJ_TEST_A']).toBe('process');
    expect(process.env['PJ_TEST_B']).toBeUndefined();
  });
});
