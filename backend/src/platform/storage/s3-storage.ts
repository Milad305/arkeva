import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { AppConfig } from '../../config/config.js';
import { assertSafeKey, ObjectStorage, type SignedLinkOptions } from './object-storage.js';

/** راه‌انداز S3 و MinIO (02 پشته)؛ لینک امضاشدهٔ خود S3. فقط وقتی MinIO یا S3 در دسترس است آزموده می‌شود. */
export class S3Storage extends ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(settings: NonNullable<AppConfig['storage']['s3']>) {
    super();
    this.bucket = settings.bucket;
    this.client = new S3Client({
      region: settings.region,
      endpoint: settings.endpoint ?? undefined,
      forcePathStyle: settings.forcePathStyle,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async putFile(key: string, path: string, contentType: string): Promise<void> {
    assertSafeKey(key);
    const { size } = await stat(path);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: createReadStream(path), ContentLength: size, ContentType: contentType }),
    );
  }

  async openRead(key: string): Promise<Readable | null> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return result.Body instanceof Readable ? result.Body : null;
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async get(key: string): Promise<Buffer | null> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0;
    let token: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }));
      const keys = (page.Contents ?? []).flatMap((entry) => (entry.Key ? [{ Key: entry.Key }] : []));
      if (keys.length > 0) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }));
        deleted += keys.length;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return deleted;
  }

  signedUrl(key: string, options: SignedLinkOptions): Promise<string> {
    assertSafeKey(key);
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(options.fileName)}`;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: disposition, ResponseContentType: options.contentType }),
      { expiresIn: options.ttlSec },
    );
  }
}
