import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-core';
import { AppConfig } from '../../../config/config.js';

// PDF گزارش با Chromium بی‌سر (تصمیم کاربر 1405/08/26؛ management-reports.md ۷.۲؛ AC-MR-04). صفحه بی شبکه و بی جاوااسکریپت
// ساخته می‌شود؛ فونت Vazirmatn از بستهٔ @fontsource درون سند (data URI). مسیر مرورگر از REPORT_BROWSER_PATH یا جای‌های رایج.

export abstract class PdfRenderer {
  abstract render(html: string, page: { readonly header: string; readonly footer: string }): Promise<{ pdf: Buffer; pages: number }>;
}

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

let fontCss: string | null = null;

/** @font-face وزن ۴۰۰ و ۷۰۰ با unicode-range خود بسته و فایل woff2 درون‌سند. */
export function reportFontCss(): string {
  if (fontCss !== null) return fontCss;
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('@fontsource/vazirmatn/package.json'));
  fontCss = ['400.css', '700.css']
    .map((file) =>
      readFileSync(join(root, file), 'utf8').replace(/src: url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\)[^;]*;/g, (_match, name: string) => {
        const data = readFileSync(join(root, 'files', name)).toString('base64');
        return `src: url(data:font/woff2;base64,${data}) format('woff2');`;
      }),
    )
    .join('\n');
  return fontCss;
}

@Injectable()
export class ChromiumPdfRenderer extends PdfRenderer {
  private readonly logger = new Logger(ChromiumPdfRenderer.name);

  constructor(private readonly config: AppConfig) {
    super();
  }

  private executable(): string {
    const configured = this.config.reports.browserPath;
    const found = configured ?? CANDIDATES.find((path) => existsSync(path));
    if (!found || !existsSync(found)) throw new Error('Chromium یا Chrome برای ساخت PDF پیدا نشد؛ REPORT_BROWSER_PATH را تعیین کنید.');
    return found;
  }

  async render(html: string, page: { readonly header: string; readonly footer: string }): Promise<{ pdf: Buffer; pages: number }> {
    const browser = await puppeteer.launch({
      executablePath: this.executable(),
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    });
    try {
      const tab = await browser.newPage();
      await tab.setJavaScriptEnabled(false);
      await tab.setRequestInterception(true);
      // فقط خود سند و data URI؛ هیچ درخواست بیرونی
      tab.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
      await tab.setContent(html, { waitUntil: 'load', timeout: 30_000 });
      const pdf = Buffer.from(
        await tab.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: page.header,
          footerTemplate: page.footer,
          margin: { top: '22mm', bottom: '18mm', left: '14mm', right: '14mm' },
          timeout: 60_000,
        }),
      );
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      return { pdf, pages: Math.max(1, pages) };
    } catch (error) {
      this.logger.warn({ err: error }, 'pdf render failed');
      throw error;
    } finally {
      await browser.close();
    }
  }
}
