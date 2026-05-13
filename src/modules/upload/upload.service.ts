import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Public URL clients use for `<img src>` and PATCH `avatarUrl`.
   */
  avatarFilePublicUrl(req: Request, filename: string): string {
    const fromEnv = this.config.get<string>('PUBLIC_APP_URL')?.trim();
    if (fromEnv) {
      const base = fromEnv.replace(/\/$/, '');
      return `${base}/v1/uploads/avatars/${filename}`;
    }
    const xfProto = req.get('x-forwarded-proto');
    const xfHost = req.get('x-forwarded-host');
    const proto =
      xfProto ??
      (req.secure
        ? 'https'
        : ((req.connection as { encrypted?: boolean } | undefined)?.encrypted
            ? 'https'
            : 'http'));
    const host = xfHost ?? req.get('host');
    if (!host) {
      return `/v1/uploads/avatars/${filename}`;
    }
    return `${proto}://${host}/v1/uploads/avatars/${filename}`;
  }

  /** Public URL for receipt files served from **`uploads/receipts/`** (local **RECEIPT_STORAGE**). */
  receiptFilePublicUrl(req: Request, filename: string): string {
    const fromEnv = this.config.get<string>('PUBLIC_APP_URL')?.trim();
    if (fromEnv) {
      const base = fromEnv.replace(/\/$/, '');
      return `${base}/v1/uploads/receipts/${filename}`;
    }
    const xfProto = req.get('x-forwarded-proto');
    const xfHost = req.get('x-forwarded-host');
    const proto =
      xfProto ??
      (req.secure
        ? 'https'
        : ((req.connection as { encrypted?: boolean } | undefined)?.encrypted
            ? 'https'
            : 'http'));
    const host = xfHost ?? req.get('host');
    if (!host) {
      return `/v1/uploads/receipts/${filename}`;
    }
    return `${proto}://${host}/v1/uploads/receipts/${filename}`;
  }
}
