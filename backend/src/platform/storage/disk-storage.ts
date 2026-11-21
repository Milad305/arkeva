import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { dirname, join, resolve, sep } from 'node:path';
import type { Clock } from '../clock/clock.js';
import type { LinkSigner } from './link-signer.js';
import { assertSafeKey, ObjectStorage, type SignedLinkOptions } from './object-storage.js';

/** راه‌انداز دیسک: هر کلید یک فایل زیر ریشه؛ لینک امضاشده به `GET /v1/files/content?token=` خود اپ. */
export class DiskStorage extends ObjectStorage {
  private readonly root: string;

  constructor(
    root: string,
    private readonly signer: LinkSigner,
    private readonly clock: Clock,
  ) {
    super();
    this.root = resolve(root);
  }

  private path(key: string): string {
    assertSafeKey(key);
    const path = resolve(join(this.root, ...key.split('/')));
    if (!path.startsWith(this.root + sep)) throw new Error(`کلید بیرون از ریشه: ${key}`);
    return path;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async putFile(key: string, source: string): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await copyFile(source, path);
  }

  async openRead(key: string): Promise<Readable | null> {
    const path = this.path(key);
    try {
      await stat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    return createReadStream(path);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<number> {
    const trimmed = prefix.replace(/\/+$/, '');
    assertSafeKey(trimmed);
    const path = resolve(join(this.root, ...trimmed.split('/')));
    if (!path.startsWith(this.root + sep)) throw new Error(`پیشوند بیرون از ریشه: ${prefix}`);
    await rm(path, { recursive: true, force: true });
    return 1;
  }

  signedUrl(key: string, options: SignedLinkOptions): Promise<string> {
    assertSafeKey(key);
    const exp = Math.floor(this.clock.now().getTime() / 1000) + options.ttlSec;
    const token = this.signer.sign({ key, exp, fileName: options.fileName, contentType: options.contentType });
    return Promise.resolve(`/v1/files/content?token=${encodeURIComponent(token)}`);
  }
}
