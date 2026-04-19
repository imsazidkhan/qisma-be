import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service.js';
import {
  OTP_REDIS_KEYS,
  IDEMPOTENCY_CONSTANTS,
} from '../../modules/otp/constants/otp.constants.js';
import { IdempotencyConflictException } from '../exceptions/api.exception.js';

export interface IdempotencyResult<T> {
  cached: boolean;
  response: T | null;
}

interface CachedResponse {
  status: 'processing' | 'completed';
  response?: unknown;
  completedAt?: number;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if response exists for idempotency key
   * If processing, throws conflict. If completed, returns cached response.
   */
  async getOrLock<T>(idempotencyKey: string): Promise<IdempotencyResult<T>> {
    const key = OTP_REDIS_KEYS.idempotency(idempotencyKey);

    const existing = await this.redisService.get(key);

    if (existing) {
      const cached = JSON.parse(existing) as CachedResponse;

      if (cached.status === 'processing') {
        throw new IdempotencyConflictException();
      }

      if (cached.status === 'completed' && cached.response !== undefined) {
        return {
          cached: true,
          response: cached.response as T,
        };
      }
    }

    // Set processing lock
    const processingLock: CachedResponse = { status: 'processing' };
    await this.redisService.set(
      key,
      JSON.stringify(processingLock),
      IDEMPOTENCY_CONSTANTS.PROCESSING_TTL_SECONDS,
    );

    return { cached: false, response: null };
  }

  /**
   * Store completed response for idempotency key
   */
  async complete<T>(idempotencyKey: string, response: T): Promise<void> {
    const key = OTP_REDIS_KEYS.idempotency(idempotencyKey);

    const cached: CachedResponse = {
      status: 'completed',
      response,
      completedAt: Date.now(),
    };

    await this.redisService.set(
      key,
      JSON.stringify(cached),
      IDEMPOTENCY_CONSTANTS.TTL_SECONDS,
    );
  }

  /**
   * Release processing lock on error (allows retry)
   */
  async release(idempotencyKey: string): Promise<void> {
    const key = OTP_REDIS_KEYS.idempotency(idempotencyKey);
    await this.redisService.del(key);
  }

  /**
   * Validate idempotency key format
   */
  isValidKey(key: string | undefined): key is string {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return trimmed.length > 0 && trimmed.length <= 64;
  }
}
