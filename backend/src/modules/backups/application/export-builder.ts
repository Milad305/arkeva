import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { Injectable } from '@nestjs/common';
import { streamSink, ZipWriter } from '../../../platform/archive/zip.js';
import { ObjectStorage } from '../../../platform/storage/object-storage.js';
import type { ProjectExport } from '../domain/backup.entities.js';
import { BOM, safeName, toCsv } from '../domain/text.js';
import { type FileRef, ProjectDump } from './project-dump.js';

// محتوای ZIP کامل پروژه (F20 ۱۲؛ «WBS، CBS، گزارش‌ها، عکس‌ها، CSV و JSON»): هر جدول پروژه هم JSON Lines و هم CSV، عکس‌ها و پیوست‌ها
// و فایل گزارش‌های ساخته‌شده. بی `cbs.view_amounts` (D11): جدول‌های مبلغ‌دار، ستون‌های پولی، گزارش‌های با مبلغ و فایل‌های ورودی
// بیرون‌اند. فایل‌ها یکی‌یکی از ذخیره‌سازی خوانده و جریانی در فایل موقت نوشته می‌شوند.

const STORED = /\.(jpe?g|png|webp|heic|gif|pdf|zip|xlsx|docx|mp4)$/i;
const SKIPPED_KINDS = new Set(['import', 'export', 'backup']);

function readme(amounts: boolean): Buffer {
  const lines = [
    'خروجی کامل پروژه — پروژه‌یار',
    '',
    'data/   هر جدول پروژه به‌صورت JSON Lines (یک ردیف در هر خط)',
    'csv/    همان جدول‌ها به‌صورت CSV برای Excel',
    'files/  عکس‌ها و پیوست‌های گزارش کارگاه، مشکلات و ریسک‌ها',
    'reports/ فایل گزارش‌های مدیریتی ساخته‌شده',
    '',
    'تاریخ‌ها میلادی (ISO) و لحظه‌ها UTC است؛ مبلغ‌ها ریال.',
    amounts ? '' : 'این خروجی بدون مبلغ است: درخواست‌کننده دسترسی «مشاهدهٔ مبالغ» نداشت.',
  ];
  return Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8');
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** نام ورودی ZIP یک فایل؛ null ← بیرون. */
function entryFor(file: FileRef, amounts: boolean): string | null {
  const id = text(file.row['id']).slice(0, 8);
  if (file.table === 'stored_file') {
    const kind = text(file.row['kind']);
    return SKIPPED_KINDS.has(kind) ? null : `files/${kind}/${id}-${safeName(text(file.row['file_name']))}`;
  }
  if (file.table === 'generated_report') {
    if (file.row['status'] !== 'done' || (!amounts && file.row['includes_amounts'] === true)) return null;
    return `reports/${safeName(text(file.row['template_name']))}-${id}.${text(file.row['format']) || 'pdf'}`;
  }
  // فایل ورودی و خروجی MSP و مانند آن فقط با مبلغ (ممکن است هزینه داشته باشند)
  return amounts ? `files/${file.table}/${id}-${safeName(file.storageKey.split('/').at(-1) ?? 'file')}` : null;
}

@Injectable()
export class ExportBuilder {
  constructor(
    private readonly dump: ProjectDump,
    private readonly storage: ObjectStorage,
  ) {}

  /** ZIP را در `path` می‌نویسد؛ اندازهٔ کل. */
  async build(row: ProjectExport, path: string, at: Date): Promise<number> {
    const snapshot = await this.dump.snapshot(row.projectId, row.includesAmounts);
    const stream = createWriteStream(path);
    const zip = new ZipWriter(streamSink(stream), at);
    try {
      await zip.add('README.txt', readme(row.includesAmounts));
      for (const table of snapshot.tables) {
        await zip.add(`data/${table.name}.jsonl`, Buffer.from(table.rows.map((entry) => JSON.stringify(entry)).join('\n')));
        await zip.add(`csv/${table.name}.csv`, toCsv(table.rows));
      }
      const seen = new Set<string>();
      for (const file of snapshot.files) {
        const name = entryFor(file, row.includesAmounts);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const body = await this.storage.get(file.storageKey);
        if (body) await zip.add(name, body, !STORED.test(name));
      }
      return await zip.finish();
    } finally {
      stream.end();
      await finished(stream);
    }
  }
}
