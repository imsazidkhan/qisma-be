import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find existing user by identifier or create a new one.
   * Uses upsert to handle race conditions atomically.
   */
  async findOrCreateByIdentifier(identifier: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { identifier },
      update: {},
      create: { identifier },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { identifier } });
  }

  /**
   * Atomic upsert that also sets phoneVerified + lastLoginAt.
   * Called when an OTP verification succeeds.
   */
  async upsertVerifiedLogin(identifier: string): Promise<User> {
    const now = new Date();
    return this.prisma.user.upsert({
      where: { identifier },
      update: {
        phoneVerified: true,
        lastLoginAt: now,
      },
      create: {
        identifier,
        phoneVerified: true,
        lastLoginAt: now,
      },
    });
  }
}
