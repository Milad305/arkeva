import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

// نوشتن و خواندن ZIP بی وابستگی (F20 ۱۲: پشتیبان و خروجی کامل پروژه). نام UTF-8 (بیت ۱۱)، فشرده‌سازی deflate فقط وقتی
// کوچک‌تر کند. ZIP64 پشتیبانی نمی‌شود: هر فایل و کل آرشیو زیر ۴ گیگابایت و حداکثر ۶۵۵۳۵ ورودی `[پیش‌فرض فنی]`.

const LIMIT = 0xffff_ffff;
const MAX_ENTRIES = 0xffff;
const UTF8_FLAG = 0x0800;

export interface ZipSink {
  write(chunk: Buffer): Promise<void>;
}

/** مقصد در حافظه (پشتیبان پروژه که فقط داده است). */
export function memorySink(): ZipSink & { buffer(): Buffer } {
  const chunks: Buffer[] = [];
  return {
    write: (chunk) => {
      chunks.push(chunk);
      return Promise.resolve();
    },
    buffer: () => Buffer.concat(chunks),
  };
}

/** مقصد جریانی (فایل موقت خروجی کامل)؛ هر نوشتن تا تخلیه صبر می‌کند. */
export function streamSink(stream: NodeJS.WritableStream): ZipSink {
  return {
    write: (chunk) =>
      new Promise<void>((resolve, reject) => {
        stream.write(chunk, (error) => (error ? reject(error) : resolve()));
      }),
  };
}

/** زمان DOS از اجزای UTC. */
function dosTime(at: Date): { time: number; date: number } {
  const year = Math.max(1980, at.getUTCFullYear());
  return {
    time: (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | Math.floor(at.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate(),
  };
}

export class ZipWriter {
  private offset = 0;
  private readonly central: Buffer[] = [];
  private count = 0;
  private readonly stamp: { time: number; date: number };

  constructor(
    private readonly sink: ZipSink,
    modifiedAt: Date,
  ) {
    this.stamp = dosTime(modifiedAt);
  }

  get entries(): number {
    return this.count;
  }

  /** `compress: false` برای عکس و PDF که فشرده‌اند. */
  async add(name: string, data: Buffer, compress = true): Promise<void> {
    const nameBytes = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const deflated = compress && data.length > 0 ? deflateRawSync(data) : null;
    const body = deflated && deflated.length < data.length ? deflated : data;
    const method = body === data ? 0 : 8;
    if (this.count >= MAX_ENTRIES || data.length > LIMIT || this.offset + 30 + nameBytes.length + body.length > LIMIT) {
      throw new Error('آرشیو از سقف ZIP بی ZIP64 (۴ گیگابایت یا ۶۵۵۳۵ ورودی) بزرگ‌تر شد');
    }
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(this.stamp.time, 10);
    local.writeUInt16LE(this.stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(UTF8_FLAG, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(this.stamp.time, 12);
    header.writeUInt16LE(this.stamp.date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(body.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt32LE(this.offset, 42);
    this.central.push(header, nameBytes);
    await this.sink.write(local);
    await this.sink.write(nameBytes);
    await this.sink.write(body);
    this.offset += 30 + nameBytes.length + body.length;
    this.count += 1;
  }

  /** فهرست مرکزی و پایان؛ اندازهٔ کل آرشیو. */
  async finish(): Promise<number> {
    const directory = Buffer.concat(this.central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.count, 8);
    end.writeUInt16LE(this.count, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(this.offset, 16);
    await this.sink.write(directory);
    await this.sink.write(end);
    return this.offset + directory.length + end.length;
  }
}

/** خواندن آرشیو کامل در حافظه (اسکریپت بازگشایی پشتیبان و تست). */
export function readZip(archive: Buffer): Map<string, Buffer> {
  const endAt = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0) throw new Error('فایل ZIP نیست');
  const count = archive.readUInt16LE(endAt + 10);
  let at = archive.readUInt32LE(endAt + 16);
  const files = new Map<string, Buffer>();
  for (let index = 0; index < count; index += 1) {
    const method = archive.readUInt16LE(at + 10);
    const size = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const skip = nameLength + archive.readUInt16LE(at + 30) + archive.readUInt16LE(at + 32);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const local = archive.readUInt32LE(at + 42);
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const body = archive.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(body) : Buffer.from(body));
    at += 46 + skip;
  }
  return files;
}
