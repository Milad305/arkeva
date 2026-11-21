import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { memorySink, readZip, ZipWriter } from '../../../platform/archive/zip.js';
import { openBackup, sealBackup } from './backup-crypto.js';
import { planDump, selectSql } from './dump-plan.js';
import { sizeText, toCsv } from './text.js';

// پشتیبان پروژه (F20 ۱۲): ZIP بی وابستگی، رمزنگاری با کلید سازمان، طرح دامپ از کاتالوگ و حذف مبلغ (D11).

const ORG_A = '01930000-0000-7000-8000-00000000000a';
const ORG_B = '01930000-0000-7000-8000-00000000000b';
const AT = new Date('2026-11-17T22:30:00Z');

describe('پشتیبان: ZIP و رمزنگاری', () => {
  it('ZIP با نام فارسی و فایل فشرده و ذخیره‌شده دوباره همان را می‌دهد', async () => {
    const sink = memorySink();
    const zip = new ZipWriter(sink, AT);
    const text = Buffer.from('ردیف '.repeat(500));
    const photo = randomBytes(2048);
    await zip.add('data/گزارش.jsonl', text);
    await zip.add('files/photo.jpg', photo, false);
    await zip.add('empty.txt', Buffer.alloc(0));
    const size = await zip.finish();
    const archive = sink.buffer();
    expect(size).toBe(archive.length);
    expect(archive.length).toBeLessThan(text.length + photo.length);
    const files = readZip(archive);
    expect([...files.keys()]).toEqual(['data/گزارش.jsonl', 'files/photo.jpg', 'empty.txt']);
    expect(files.get('data/گزارش.jsonl')?.equals(text)).toBe(true);
    expect(files.get('files/photo.jpg')?.equals(photo)).toBe(true);
  });

  it('نسخهٔ یک سازمان با کلید همان سازمان باز می‌شود؛ سازمان دیگر، دستکاری یا kid ناشناخته خطا', () => {
    const key = { kid: 'k1', secret: randomBytes(32) };
    const plain = Buffer.from('{"project":"PRJ-1405-001"}');
    const sealed = sealBackup(plain, key, ORG_A);
    expect(sealed.subarray(0, 4).toString()).toBe('PYBK');
    expect(sealed.includes(plain)).toBe(false);
    expect(openBackup(sealed, [{ kid: 'k0', secret: randomBytes(32) }, key], ORG_A).equals(plain)).toBe(true);
    expect(() => openBackup(sealed, [key], ORG_B)).toThrow();
    const tampered = Buffer.from(sealed);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
    expect(() => openBackup(tampered, [key], ORG_A)).toThrow();
    expect(() => openBackup(sealed, [{ kid: 'k9', secret: key.secret }], ORG_A)).toThrow(/k1/);
  });
});

describe('پشتیبان: طرح دامپ', () => {
  const column = (table: string, name: string, type = 'uuid') => ({ table, name, type });
  const columns = [
    column('project', 'id'),
    column('project', 'code', 'text'),
    column('wbs_item', 'id'),
    column('wbs_item', 'project_id'),
    column('plan_version', 'id'),
    column('plan_version', 'project_id'),
    column('wbs_item_plan', 'plan_version_id'),
    column('wbs_item_plan', 'title', 'text'),
    column('cost_entry', 'id'),
    column('cost_entry', 'project_id'),
    column('cost_entry', 'amount', 'bigint'),
    column('project_progress', 'project_id'),
    column('project_progress', 'bac', 'bigint'),
    column('project_progress', 'cpi', 'numeric'),
    column('domain_event', 'project_id'),
    column('app_user', 'id'),
  ];
  const keys = [
    { child: 'wbs_item_plan', parent: 'plan_version', childColumns: ['plan_version_id'], parentColumns: ['id'] },
    { child: 'project', parent: 'app_user', childColumns: ['manager_user_id'], parentColumns: ['id'] },
  ];

  it('ریشه، جدول‌های project_id و فرزند کلید خارجی؛ عملیاتی و سازمانی بیرون', () => {
    const plan = planDump(columns, keys);
    expect(plan.map((table) => table.name)).toEqual(['cost_entry', 'plan_version', 'project', 'project_progress', 'wbs_item', 'wbs_item_plan']);
    expect(plan.find((table) => table.name === 'project')?.where).toBe('t.id = ?');
    expect(plan.find((table) => table.name === 'wbs_item_plan')?.where).toBe(
      '(t."plan_version_id") in (select p0."id" from "plan_version" p0 where p0.project_id = ?)',
    );
  });

  it('D11 — بی مبلغ: جدول دفتر هزینه بیرون و ستون‌های bigint برداشته؛ نسبت‌ها می‌مانند', () => {
    const plan = planDump(columns, keys);
    const table = (name: string) => plan.find((entry) => entry.name === name) ?? plan[0]!;
    expect(selectSql(table('cost_entry'), false)).toBeNull();
    expect(selectSql(table('cost_entry'), true)).toContain('t."amount"');
    const progress = selectSql(table('project_progress'), false) ?? '';
    expect(progress).not.toContain('"bac"');
    expect(progress).toContain('t."cpi"');
  });

  it('اندازه و CSV', () => {
    expect(sizeText(2_576_980_378)).toBe('۲٫۴ گیگابایت');
    expect(sizeText(24_576)).toBe('۲۴ کیلوبایت');
    expect(
      toCsv([
        { a: 'x,y', b: null },
        { a: 1, c: { k: 2 } },
      ]).toString('utf8'),
    ).toBe('﻿a,b,c\r\n"x,y",,\r\n1,,"{""k"":2}"\r\n');
  });
});
