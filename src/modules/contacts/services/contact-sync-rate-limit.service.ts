import { Injectable } from '@nestjs/common';

import {
  ContactsSyncIpRateLimitedException,
  ContactsSyncUserRateLimitedException,
} from '../../../common/exceptions/api.exception';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { CONTACT_SYNC_CONSTANTS } from '../constants/contact-sync.constants';

/** Redis keys for **`POST /v1/contacts/sync`** rate-limit counters. */
export const CONTACT_SYNC_RATELIMIT_KEYS = {
  user: (userId: string): string => `ratelimit:contacts:sync:user:${userId}`,
  ip: (ip: string): string => `ratelimit:contacts:sync:ip:${ip}`,
};

/** **BE Task 8:** **`POST /v1/contacts/sync`** — Redis sliding windows (**IP** bucket, then **user** bucket) via **`atomicIncrementWithLimit`**. Set **`TRUST_PROXY=true`** behind a proxy so **`@Ip()`** is meaningful. */
@Injectable()
export class ContactSyncRateLimitService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Consumes quota on acceptance (checks **IP** first, then **authenticated user**).
   * Caller must invoke only after JWT is verified.
   */
  async enforceForSync(userId: string, rawClientIp: string): Promise<void> {
    const ip = ContactSyncRateLimitService.normalizeIp(rawClientIp);

    const { IP_MAX_REQUESTS, IP_WINDOW_SECONDS, USER_MAX_REQUESTS, USER_WINDOW_SECONDS } =
      CONTACT_SYNC_CONSTANTS.RATE_LIMIT;

    const ipKey = CONTACT_SYNC_RATELIMIT_KEYS.ip(ip);
    const ipResult = await this.redis.atomicIncrementWithLimit(
      ipKey,
      IP_MAX_REQUESTS,
      IP_WINDOW_SECONDS,
    );

    if (!ipResult.allowed) {
      const ttl = await this.redis.ttl(ipKey);
      throw new ContactsSyncIpRateLimitedException(
        ttl > 0 ? ttl : IP_WINDOW_SECONDS,
      );
    }

    const userKey = CONTACT_SYNC_RATELIMIT_KEYS.user(userId);
    const userResult = await this.redis.atomicIncrementWithLimit(
      userKey,
      USER_MAX_REQUESTS,
      USER_WINDOW_SECONDS,
    );

    if (!userResult.allowed) {
      const ttl = await this.redis.ttl(userKey);
      throw new ContactsSyncUserRateLimitedException(
        ttl > 0 ? ttl : USER_WINDOW_SECONDS,
      );
    }
  }

  private static normalizeIp(ip: string): string {
    if (!ip?.trim()) {
      return 'unknown';
    }
    if (ip === '::1') {
      return '127.0.0.1';
    }
    if (ip.startsWith('::ffff:')) {
      return ip.slice(7);
    }
    return ip;
  }
}
