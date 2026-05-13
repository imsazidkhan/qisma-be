import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  RATE_LIMIT_CONSTANTS,
  OTP_REDIS_KEYS,
} from '../constants/otp.constants';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Check and consume rate limit for a phone number
   * Uses atomic increment to handle parallel requests safely
   */
  async checkPhoneRateLimit(identifier: string): Promise<RateLimitResult> {
    const key = OTP_REDIS_KEYS.phoneRateLimit(identifier);
    const { allowed, attempts } =
      await this.redisService.atomicIncrementWithLimit(
        key,
        RATE_LIMIT_CONSTANTS.PHONE_MAX_REQUESTS,
        RATE_LIMIT_CONSTANTS.PHONE_WINDOW_SECONDS,
      );

    if (!allowed) {
      const ttl = await this.redisService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT_CONSTANTS.PHONE_WINDOW_SECONDS,
      };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONSTANTS.PHONE_MAX_REQUESTS - attempts,
    };
  }

  /**
   * Check and consume rate limit for an IP address
   * Uses atomic increment to handle parallel requests safely
   */
  async checkIpRateLimit(ip: string): Promise<RateLimitResult> {
    const normalizedIp = this.normalizeIp(ip);
    const key = OTP_REDIS_KEYS.ipRateLimit(normalizedIp);
    const { allowed, attempts } =
      await this.redisService.atomicIncrementWithLimit(
        key,
        RATE_LIMIT_CONSTANTS.IP_MAX_REQUESTS,
        RATE_LIMIT_CONSTANTS.IP_WINDOW_SECONDS,
      );

    if (!allowed) {
      const ttl = await this.redisService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT_CONSTANTS.IP_WINDOW_SECONDS,
      };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONSTANTS.IP_MAX_REQUESTS - attempts,
    };
  }

  /**
   * Combined rate limit check for both phone and IP
   * Returns the most restrictive result
   */
  async checkRateLimits(
    identifier: string,
    ip: string,
  ): Promise<{
    phoneLimit: RateLimitResult;
    ipLimit: RateLimitResult;
  }> {
    const [phoneLimit, ipLimit] = await Promise.all([
      this.checkPhoneRateLimit(identifier),
      this.checkIpRateLimit(ip),
    ]);

    return { phoneLimit, ipLimit };
  }

  /**
   * Check and consume rate limit for verify requests per session
   * Uses atomic increment to handle parallel requests safely
   */
  async checkVerifyRateLimit(sessionId: string): Promise<RateLimitResult> {
    const key = OTP_REDIS_KEYS.verifyRateLimit(sessionId);
    const { allowed, attempts } =
      await this.redisService.atomicIncrementWithLimit(
        key,
        RATE_LIMIT_CONSTANTS.VERIFY_MAX_REQUESTS,
        RATE_LIMIT_CONSTANTS.VERIFY_WINDOW_SECONDS,
      );

    if (!allowed) {
      const ttl = await this.redisService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT_CONSTANTS.VERIFY_WINDOW_SECONDS,
      };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONSTANTS.VERIFY_MAX_REQUESTS - attempts,
    };
  }

  /**
   * Normalize IP address for consistent key generation
   */
  private normalizeIp(ip: string): string {
    if (!ip) return 'unknown';
    // Handle IPv6 localhost
    if (ip === '::1') return '127.0.0.1';
    // Handle IPv4-mapped IPv6
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    return ip;
  }
}
