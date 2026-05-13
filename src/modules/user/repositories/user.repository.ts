import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { USER_CONSTANTS } from '../constants/user.constants';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find existing user by identifier or create a new one.
   * Uses upsert to handle race conditions atomically.
   */
  async upsertByIdentifier(identifier: string): Promise<User> {
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

  /** `username` is stored lowercase-only in the DB. */
  async findByUsername(normalizedUsername: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
  }

  /**
   * Unified directory search (`q`): optional **exact phone**, optional **username prefix**,
   * plus **display name** case-insensitive contains (always).
   */
  async searchFlexible(
    excludeUserId: string,
    take: number,
    opts: {
      fullPhone?: string;
      usernamePrefix: string | null;
      nameContains: string;
    },
  ): Promise<Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>[]> {
    const or: Prisma.UserWhereInput[] = [];

    if (opts.fullPhone) {
      or.push({ identifier: opts.fullPhone });
    }

    const un = opts.usernamePrefix;
    if (
      un !== null &&
      un.length >= USER_CONSTANTS.SEARCH_USERNAME_PREFIX_MIN
    ) {
      or.push({
        username: { startsWith: un },
      });
    }

    or.push({
      AND: [
        { name: { not: null } },
        {
          name: {
            contains: opts.nameContains,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    });

    return this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: excludeUserId },
        OR: or,
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * **Contact discovery (`POST /v1/contacts/sync`):** active **`User`** rows whose **phone**
   * is **`IN`** the normalized upload set (**\`User.identifier\`** — subscriber digits aligned with OTP / E.164 sync).
   *
   * **SQL shape:** \`WHERE is_active AND id <> :excludeUserId AND identifier = ANY(:uploadedPhones)\`
   *
   * @param uploadedNormalizedPhones — Deduped E.164-digit strings from **`user_synced_contacts.phone`**
   */
  async findActiveUsersByPhoneInUploadedSet(
    uploadedNormalizedPhones: string[],
    excludeUserId: string,
  ): Promise<Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>[]> {
    if (uploadedNormalizedPhones.length === 0) {
      return [];
    }
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: excludeUserId },
        identifier: { in: uploadedNormalizedPhones },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Deduped active **\`User.identifier\`** values that appear in **`uploadedNormalizedPhones`**
   * (includes the viewer’s own number if present — used for **unregistered** contact split).
   */
  async findActiveIdentifiersInPhoneList(
    uploadedNormalizedPhones: string[],
  ): Promise<string[]> {
    if (uploadedNormalizedPhones.length === 0) {
      return [];
    }
    const rows = await this.prisma.user.findMany({
      where: {
        isActive: true,
        identifier: { in: uploadedNormalizedPhones },
      },
      select: { identifier: true },
    });
    return [...new Set(rows.map((r) => r.identifier))];
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

  async updateProfile(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
