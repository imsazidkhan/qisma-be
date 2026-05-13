import { Injectable } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service';

const PREFIX = 'lb:analytics:';

/** TTL 5–15 minutes per product spec — individual endpoints pick `ttl`. */
const DEFAULT_TTLS = {
  breakdown: 300,
  trends: 300,
  merchants: 600,
};

@Injectable()
export class GroupAnalyticsCacheService {
  constructor(private readonly redis: RedisService) {}

  static readonly ttls = DEFAULT_TTLS;

  key(groupId: string, suffix: string): string {
    return `${PREFIX}${groupId}:${suffix}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  /** Fire-and-forget safe: analytics may briefly read stale totals after expense writes. */
  async invalidateGroup(groupId: string): Promise<void> {
    await this.redis.deleteByPattern(`${PREFIX}${groupId}:*`);
  }
}
