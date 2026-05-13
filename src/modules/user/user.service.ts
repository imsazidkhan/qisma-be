import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { Prisma as PrismaClient } from '@prisma/client';
import {
  AccountInactiveException,
  InvalidDisplayNameException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { UserRepository } from './repositories/user.repository';
import { sanitizeDisplayName } from './utils/display-name';
import { USER_CONSTANTS } from './constants/user.constants';

export type UserSearchHit = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
};

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  /**
   * Find existing user by identifier or create a new one.
   * Uses upsert to handle race conditions atomically.
   */
  async findOrCreateByIdentifier(identifier: string): Promise<User> {
    return this.users.upsertByIdentifier(identifier);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.users.findByIdentifier(identifier);
  }

  async findByUsername(normalizedUsername: string): Promise<User | null> {
    return this.users.findByUsername(normalizedUsername);
  }

  /**
   * Directory search (`GET /users/search?q`): **phone** (exact when `q` is full E.164),
   * **username** (prefix from leading `[a-z0-9_]` in `q`), **name** (case-insensitive contains).
   * Never returns the **actor**; inactive users omitted. **≤20** hits.
   */
  async searchUsers(actorUserId: string, q: string): Promise<UserSearchHit[]> {
    const actor = await this.users.findById(actorUserId);
    if (!actor) {
      throw new UserNotFoundException();
    }
    if (!actor.isActive) {
      throw new AccountInactiveException();
    }

    const trimmed = q.trim();
    const fullPhone = USER_CONSTANTS.SEARCH_QUERY_AS_PHONE_REGEX.test(trimmed)
      ? trimmed
      : undefined;

    const unameCand = trimmed.toLowerCase().replace(/^@/, '');
    const slugRun = /^[a-z0-9_]+/.exec(unameCand);
    const slug = slugRun ? slugRun[0] : '';
    const usernamePrefix =
      slug.length >= USER_CONSTANTS.SEARCH_USERNAME_PREFIX_MIN ? slug : null;

    const rows = await this.users.searchFlexible(
      actorUserId,
      USER_CONSTANTS.SEARCH_MAX_RESULTS,
      {
        ...(fullPhone !== undefined ? { fullPhone } : {}),
        usernamePrefix,
        nameContains: trimmed,
      },
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username ?? null,
      avatar: r.avatarUrl,
    }));
  }

  /**
   * **Contact matching:** **`users.phone`** (stored as **`User.identifier`**) **IN** the uploaded normalized set —
   * **active** rows only; **caller** excluded.
   *
   * **Returns** **BE Task 7** minimal fields only: **id**, **name**, **username**, **avatar** (maps **`avatarUrl` → avatar**).
   */
  async findUsersByPhoneIdentifiers(
    excludeUserId: string,
    normalizedPhones: string[],
  ): Promise<UserSearchHit[]> {
    const rows = await this.users.findActiveUsersByPhoneInUploadedSet(
      normalizedPhones,
      excludeUserId,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username ?? null,
      avatar: r.avatarUrl,
    }));
  }

  /** Active **\`identifier\`** strings from the upload (**any** active row, including caller’s own). */
  async findActiveIdentifiersInPhoneList(
    uploadedNormalizedPhones: string[],
  ): Promise<string[]> {
    return this.users.findActiveIdentifiersInPhoneList(
      uploadedNormalizedPhones,
    );
  }

  /**
   * Atomic upsert that also sets phoneVerified + lastLoginAt.
   * Called when an OTP verification succeeds.
   */
  async upsertVerifiedLogin(identifier: string): Promise<User> {
    return this.users.upsertVerifiedLogin(identifier);
  }

  /**
   * Update profile fields from PATCH /auth/me (name, avatar, use case, onboarding completion).
   * At least one field must be provided (enforced by DTO).
   */
  async updateProfile(
    userId: string,
    patch: {
      name?: string;
      avatarUrl?: string;
      useCase?: string;
      onboardingCompleted?: boolean;
    },
  ): Promise<User> {
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new UserNotFoundException();
    }
    if (!existing.isActive) {
      throw new AccountInactiveException();
    }

    const data: Prisma.UserUpdateInput = {};
    if (patch.name !== undefined) {
      const name = sanitizeDisplayName(patch.name);
      if (name.length === 0) {
        throw new InvalidDisplayNameException(
          'Name cannot be empty or only whitespace.',
        );
      }
      data.name = name;
    }
    if (patch.avatarUrl !== undefined) {
      data.avatarUrl = patch.avatarUrl;
    }
    if (patch.useCase !== undefined) {
      data.useCase = patch.useCase;
    }
    if (
      patch.onboardingCompleted === true &&
      existing.onboardingCompletedAt == null
    ) {
      data.onboardingCompletedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }

    try {
      return await this.users.updateProfile(userId, data);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new UserNotFoundException();
      }
      throw error;
    }
  }
}
