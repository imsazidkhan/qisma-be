import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { UploadService } from './upload.service';

const RECEIPTS_LOCAL_DIR = join(process.cwd(), 'uploads', 'receipts');

function extForReceipt(mimetype: string, original: string): string {
  const m = original.match(/\.[a-z0-9]{1,8}$/i);
  if (m) {
    return m[0]!.toLowerCase();
  }
  switch (mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

@Injectable()
export class ReceiptStorageService {
  private s3: S3Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly upload: UploadService,
  ) {}

  /**
   * Persists receipt bytes (**local** disk or **S3**-compatible) and returns a **public URL**.
   */
  async storeReceipt(
    req: Request,
    file: Express.Multer.File,
  ): Promise<{ key: string; publicUrl: string }> {
    const storage = this.config.get<'local' | 's3'>('RECEIPT_STORAGE') ?? 'local';
    const ext = extForReceipt(file.mimetype, file.originalname);
    if (!ext) {
      throw new Error('Could not determine receipt file extension');
    }

    if (storage === 's3') {
      const key = `receipts/${randomUUID()}${ext}`;
      return this.putS3(key, file.buffer, file.mimetype);
    }

    const filename = `${randomUUID()}${ext}`;
    return this.putLocal(req, filename, file.buffer);
  }

  private async putLocal(
    req: Request,
    filename: string,
    buffer: Buffer,
  ): Promise<{ key: string; publicUrl: string }> {
    await mkdir(RECEIPTS_LOCAL_DIR, { recursive: true });
    await writeFile(join(RECEIPTS_LOCAL_DIR, filename), buffer);
    return {
      key: filename,
      publicUrl: this.upload.receiptFilePublicUrl(req, filename),
    };
  }

  private async putS3(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; publicUrl: string }> {
    const bucket = this.config.get<string>('S3_BUCKET');
    const publicBase = this.config
      .get<string>('S3_PUBLIC_BASE_URL')
      ?.trim()
      .replace(/\/$/, '');
    if (!bucket || !publicBase) {
      throw new Error('S3 bucket or S3_PUBLIC_BASE_URL missing');
    }

    const client = this.getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      key,
      publicUrl: `${publicBase}/${key}`,
    };
  }

  private getS3Client(): S3Client {
    if (!this.s3) {
      const endpoint = this.config.get<string>('S3_ENDPOINT')?.trim();
      const region = this.config.get<string>('S3_REGION') ?? 'auto';
      const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
      const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');
      if (!accessKeyId || !secretAccessKey) {
        throw new Error('S3 credentials missing');
      }
      this.s3 = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: Boolean(endpoint),
        ...(endpoint ? { endpoint } : {}),
      });
    }
    return this.s3;
  }
}
