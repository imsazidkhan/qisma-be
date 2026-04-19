import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import { RedisService } from '../../../infrastructure/redis/redis.service.js';
import { JWT_CONSTANTS, AUTH_REDIS_KEYS } from '../constants/auth.constants.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';

export interface TokenPayload {
  sub: string; // userId (database ID)
  identifier: string; // phone (for convenience / audit)
  jti?: string; // token ID (for refresh tokens)
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  private getAccessSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
    return secret;
  }

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
    return secret;
  }

  /**
   * Hash token for secure storage (SHA-256)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate access + refresh token pair.
   * Refresh token is persisted to DB (hashed) for audit + multi-device management.
   *
   * @param userId - Database user ID (used as JWT `sub`)
   * @param identifier - User identifier (phone) - for audit/convenience
   * @param familyId - Optional existing family ID (for rotation)
   * @param ctx - Optional request context (userAgent, ipAddress)
   */
  async generateTokenPair(
    userId: string,
    identifier: string,
    familyId?: string,
    ctx?: TokenContext,
  ): Promise<TokenPair> {
    const tokenId = randomUUID();
    const tokenFamilyId = familyId ?? randomUUID();

    const accessPayload: TokenPayload = {
      sub: userId,
      identifier,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.getAccessSecret(),
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    });

    const refreshPayload: TokenPayload = {
      sub: userId,
      identifier,
      jti: tokenId,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    // Persist HASHED refresh token to DB
    await this.refreshTokenRepo.create({
      id: tokenId,
      userId,
      tokenHash: this.hashToken(refreshToken),
      familyId: tokenFamilyId,
      expiresAt: new Date(
        Date.now() + JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
      ),
      ...(ctx?.userAgent !== undefined && { userAgent: ctx.userAgent }),
      ...(ctx?.ipAddress !== undefined && { ipAddress: ctx.ipAddress }),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token (signature + expiry + revocation).
   * Throws on failure.
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const payload = this.jwtService.verify<TokenPayload>(token, {
      secret: this.getAccessSecret(),
      clockTolerance: JWT_CONSTANTS.CLOCK_TOLERANCE_SECONDS,
    });

    const isRevoked = await this.isUserRevoked(payload.sub, payload);
    if (isRevoked) {
      throw new Error('SESSION_REVOKED');
    }

    return payload;
  }

  /**
   * Verify refresh token structure (JWT signature + expiry)
   */
  verifyRefreshTokenStructure(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token, {
      secret: this.getRefreshSecret(),
      clockTolerance: JWT_CONSTANTS.CLOCK_TOLERANCE_SECONDS,
    });
  }

  /**
   * Rotate refresh token (use old, issue new pair).
   * Detects reuse attacks and revokes entire token family.
   *
   * Atomicity: `markAsUsed` uses a WHERE `usedAt IS NULL` filter, so only
   * ONE concurrent request wins the rotation; others see `count = 0` and
   * trigger reuse detection.
   */
  async rotateRefreshToken(
    token: string,
    ctx?: TokenContext,
  ): Promise<{ tokens: TokenPair; reuseDetected: false }> {
    const payload = this.verifyRefreshTokenStructure(token);

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const stored = await this.refreshTokenRepo.findById(payload.jti);

    if (!stored) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Verify token hash matches (prevents tampering)
    if (stored.tokenHash !== this.hashToken(token)) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Revoked token
    if (!stored.isValid) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Expired (redundant with JWT expiry but defence-in-depth)
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // REUSE DETECTION: Already used → replay attack
    if (stored.usedAt) {
      await this.refreshTokenRepo.revokeFamily(stored.familyId);
      await this.revokeUserSessions(stored.userId);
      throw new Error('TOKEN_REUSED');
    }

    // Atomic mark-as-used (only one concurrent request succeeds)
    const updated = await this.refreshTokenRepo.markAsUsed(payload.jti);
    if (updated === 0) {
      // Lost the race → another request already rotated this token
      await this.refreshTokenRepo.revokeFamily(stored.familyId);
      await this.revokeUserSessions(stored.userId);
      throw new Error('TOKEN_REUSED');
    }

    const newTokens = await this.generateTokenPair(
      stored.userId,
      payload.identifier,
      stored.familyId,
      ctx,
    );

    return { tokens: newTokens, reuseDetected: false };
  }

  /**
   * Revoke specific refresh token (logout).
   * Idempotent — safe to call multiple times.
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = this.verifyRefreshTokenStructure(token);
      if (payload.jti) {
        await this.refreshTokenRepo.revoke(payload.jti);
      }
    } catch {
      // Silent fail - logout must be idempotent
    }
  }

  /**
   * Revoke ALL sessions for a user (security incident / forced logout).
   * Sets Redis flag (for fast access-token checks) + marks all DB tokens invalid.
   */
  async revokeUserSessions(userId: string): Promise<void> {
    await this.redisService.set(
      AUTH_REDIS_KEYS.revokedUsers(userId),
      Date.now().toString(),
      JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS,
    );
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }

  /**
   * Check if user's sessions are revoked.
   * Access tokens issued before revocation timestamp are invalid.
   */
  private async isUserRevoked(
    userId: string,
    payload: TokenPayload,
  ): Promise<boolean> {
    const revokedAt = await this.redisService.get(
      AUTH_REDIS_KEYS.revokedUsers(userId),
    );

    if (!revokedAt) return false;

    const iat = (payload as TokenPayload & { iat?: number }).iat;
    if (iat) {
      return iat * 1000 < parseInt(revokedAt, 10);
    }

    return true;
  }
}
