import { Injectable } from '@nestjs/common';
import { randomUUID, randomInt } from 'crypto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { OTP_CONSTANTS, OTP_REDIS_KEYS } from './constants/otp.constants';
import {
  OtpSession,
  OtpSessionStatus,
} from './interfaces/otp-session.interface';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import {
  ANALYTICS_EVENT,
  INVITE_CONVERSION_CHANNEL,
} from '../../common/analytics/analytics-log.constants';
import {
  CooldownException,
  InvalidOtpException,
  MaxAttemptsException,
  OtpExpiredException,
  SessionLockedException,
  SessionNotFoundException,
  InternalErrorException,
  PhoneRateLimitedException,
  IpRateLimitedException,
  VerifyRateLimitedException,
} from '../../common/exceptions/api.exception';
import { PinoLogger } from 'nestjs-pino';
import { RateLimitService } from './services/rate-limit.service';
import { TokenService } from '../auth/services/token.service';
import { UserService } from '../user/user.service';
import { GroupsService } from '../groups/groups.service';

export interface SendOtpData {
  sessionId: string;
  expiresAt: number;
  retryAfter: number;
}

export interface VerifyOtpData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

@Injectable()
export class OtpService {
  constructor(
    private readonly redisService: RedisService,
    private readonly rateLimitService: RateLimitService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly groupsService: GroupsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OtpService.name);
  }

  async sendOtp(
    phone: string,
    clientIp: string,
  ): Promise<ApiSuccessResponse<SendOtpData>> {
    const identifier = this.normalizePhone(phone);

    // ─────────────────────────────────────────────────────────────
    // ORDER: IP → Cooldown → Phone (optimized for common cases)
    // - IP check: blocks bad actors early
    // - Cooldown: cheapest check (TTL only), most common rejection
    // - Phone rate limit: only consumed if cooldown passes
    // ─────────────────────────────────────────────────────────────

    // 1. Check IP rate limit (block distributed attacks)
    const ipLimit = await this.rateLimitService.checkIpRateLimit(clientIp);
    if (!ipLimit.allowed) {
      throw new IpRateLimitedException(ipLimit.retryAfter);
    }

    // 2. Check cooldown (cheap TTL check, most common case)
    const cooldownKey = OTP_REDIS_KEYS.cooldown(identifier);
    const cooldownTtl = await this.redisService.ttl(cooldownKey);
    if (cooldownTtl > 0) {
      throw new CooldownException(cooldownTtl);
    }

    // 3. Check phone rate limit (only if cooldown passes)
    const phoneLimit =
      await this.rateLimitService.checkPhoneRateLimit(identifier);
    if (!phoneLimit.allowed) {
      throw new PhoneRateLimitedException(phoneLimit.retryAfter);
    }

    // 4. Invalidate any existing session
    await this.invalidateExistingSession(identifier);

    // 5. Create new session
    const sessionId = randomUUID();
    const otp = this.generateOtp();
    const now = Date.now();
    const expiresAt = now + OTP_CONSTANTS.EXPIRY_SECONDS * 1000;

    const session: OtpSession = {
      sessionId,
      otp,
      identifier,
      status: OtpSessionStatus.ACTIVE,
      createdAt: now,
      expiresAt,
    };

    try {
      await this.redisService.set(
        OTP_REDIS_KEYS.session(sessionId),
        JSON.stringify(session),
        OTP_CONSTANTS.EXPIRY_SECONDS,
      );

      await this.redisService.set(
        OTP_REDIS_KEYS.identifierSession(identifier),
        sessionId,
        OTP_CONSTANTS.EXPIRY_SECONDS,
      );

      await this.redisService.set(
        cooldownKey,
        '1',
        OTP_CONSTANTS.COOLDOWN_SECONDS,
      );
    } catch {
      throw new InternalErrorException();
    }

    console.log(
      `[OTP] Generated for ${identifier}: ${otp} (session: ${sessionId})`,
    );

    return {
      success: true,
      data: {
        sessionId,
        expiresAt,
        retryAfter: OTP_CONSTANTS.COOLDOWN_SECONDS,
      },
    };
  }

  async verifyOtp(
    sessionId: string,
    otp: string,
  ): Promise<ApiSuccessResponse<VerifyOtpData>> {
    const sessionKey = OTP_REDIS_KEYS.session(sessionId);
    const attemptsKey = OTP_REDIS_KEYS.attempts(sessionId);

    // ─────────────────────────────────────────────────────────────
    // VERIFICATION ORDER (SECURITY CRITICAL):
    // 0. Check verify rate limit (before any processing)
    // 1-7. Atomic verification via Lua script:
    //      - Fetch session
    //      - Check state (VERIFIED/LOCKED)
    //      - Check expiry
    //      - Check & increment attempts
    //      - Compare OTP
    //      - Update status atomically
    // ─────────────────────────────────────────────────────────────

    // 0. Check verify rate limit
    const verifyLimit =
      await this.rateLimitService.checkVerifyRateLimit(sessionId);
    if (!verifyLimit.allowed) {
      throw new VerifyRateLimitedException(verifyLimit.retryAfter);
    }

    // 1-7. Atomic verification (handles parallel requests safely)
    let result: {
      code: number;
      session?: string;
      lockedUntil?: number;
    };

    try {
      result = await this.redisService.atomicVerifyOtp(
        sessionKey,
        attemptsKey,
        otp,
        OTP_CONSTANTS.MAX_ATTEMPTS,
        OTP_CONSTANTS.LOCK_DURATION_SECONDS,
        60, // idempotency TTL
      );
    } catch {
      throw new InternalErrorException();
    }

    // Handle result codes
    switch (result.code) {
      case 1: {
        // SUCCESS - Find or create user, then generate tokens
        let identifier: string;
        if (result.session) {
          const session = JSON.parse(result.session) as OtpSession;
          identifier = session.identifier;
          await this.redisService.del(
            OTP_REDIS_KEYS.identifierSession(session.identifier),
          );
        } else {
          throw new InternalErrorException();
        }

        // Persist user + mark phoneVerified + update lastLoginAt (atomic upsert)
        const user = await this.userService.upsertVerifiedLogin(identifier);

        const invitesClaimed =
          await this.groupsService.claimPendingPhoneInvitesAfterSignup(
            user.id,
            identifier,
          );
        if (invitesClaimed > 0) {
          this.logger.info({
            msg: ANALYTICS_EVENT.INVITE_CONVERSION,
            analyticsEvent: ANALYTICS_EVENT.INVITE_CONVERSION,
            inviteChannel: INVITE_CONVERSION_CHANNEL.OTP_SIGNUP,
            userId: user.id,
            invitesClaimed,
          });
        }

        // Generate JWT tokens with userId as `sub`
        const tokens = await this.tokenService.generateTokenPair(
          user.id,
          identifier,
        );

        return {
          success: true,
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: tokens.tokenType,
          },
        };
      }

      case 2: // ALREADY_VERIFIED (idempotent - tokens already cached via idempotency)
        throw new InternalErrorException(
          'Session already verified. Use idempotency key for retries.',
        );

      case 3: // SESSION_NOT_FOUND
        throw new SessionNotFoundException();

      case 4: // SESSION_LOCKED
        if (result.lockedUntil) {
          const retryAfter = Math.ceil(
            (result.lockedUntil - Date.now()) / 1000,
          );
          throw new SessionLockedException(
            retryAfter > 0 ? retryAfter : undefined,
          );
        }
        throw new SessionLockedException();

      case 5: // OTP_EXPIRED
        throw new OtpExpiredException();

      case 6: // MAX_ATTEMPTS (just locked)
        throw new MaxAttemptsException();

      case 7: // INVALID_OTP
        throw new InvalidOtpException();

      default:
        throw new InternalErrorException();
    }
  }

  /**
   * Invalidate existing session for identifier
   */
  private async invalidateExistingSession(identifier: string): Promise<void> {
    const identifierKey = OTP_REDIS_KEYS.identifierSession(identifier);
    const existingSessionId = await this.redisService.get(identifierKey);

    if (existingSessionId) {
      await this.redisService.del(
        OTP_REDIS_KEYS.session(existingSessionId),
        OTP_REDIS_KEYS.attempts(existingSessionId),
        identifierKey,
      );
    }
  }

  /**
   * Generate cryptographically secure 6-digit OTP
   */
  private generateOtp(): string {
    const min = Math.pow(10, OTP_CONSTANTS.LENGTH - 1);
    const max = Math.pow(10, OTP_CONSTANTS.LENGTH);
    return randomInt(min, max).toString();
  }

  /**
   * Clears inter-send cooldown for this phone (digits-only identifier, same as send path).
   * Used on **logout** so the same user can immediately request a new OTP — trade-off vs stricter abuse prevention.
   */
  async clearSendCooldownForIdentifier(identifier: string): Promise<void> {
    const key = OTP_REDIS_KEYS.cooldown(this.normalizePhone(identifier));
    await this.redisService.del(key);
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
