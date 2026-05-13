import { Injectable } from '@nestjs/common';
import type { RefreshToken } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CreateRefreshTokenInput {
  id: string; // JWT jti
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        familyId: input.familyId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  /**
   * Mark a token as used (rotation). Returns updated count (0 if already used/missing).
   */
  async markAsUsed(id: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Revoke a single refresh token (logout).
   */
  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });
  }

  /**
   * Revoke all tokens in a family (reuse detection).
   */
  async revokeFamily(familyId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { familyId, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Revoke ALL tokens for a user (forced logout / security incident).
   */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * List active tokens for a user (multi-device management).
   */
  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isValid: true,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cleanup expired tokens (call periodically via cron).
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
