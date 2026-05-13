import { Injectable } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service';

const PREFIX = 'lb:group-balance:';
const TTL_SEC = 300;

export type GroupBalanceSnapshot = Readonly<{
  dominantCurrency: string;
  updatedAt: string;
  balances: readonly {
    fromUserId: string;
    toUserId: string;
    amount: string;
  }[];
  netByUserId: Readonly<Record<string, string>>;
}>;

@Injectable()
export class GroupBalanceCacheService {
  constructor(private readonly redis: RedisService) {}

  key(groupId: string): string {
    return `${PREFIX}${groupId}`;
  }

  async get(groupId: string): Promise<GroupBalanceSnapshot | null> {
    const raw = await this.redis.get(this.key(groupId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GroupBalanceSnapshot;
    } catch {
      return null;
    }
  }

  async set(groupId: string, snap: GroupBalanceSnapshot): Promise<void> {
    await this.redis.set(this.key(groupId), JSON.stringify(snap), TTL_SEC);
  }

  async invalidate(groupId: string): Promise<void> {
    await this.redis.del(this.key(groupId));
  }
}
