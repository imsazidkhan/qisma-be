import { Injectable } from '@nestjs/common';
import {
  GroupMemberRole,
  GroupMemberStatus,
  type GroupMember,
} from '@prisma/client';

import {
  GroupAdminRequiredException,
  GroupNotFoundException,
  GroupOwnerRequiredException,
  NotGroupMemberException,
} from '../../../common/exceptions/api.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * RBAC primitives for `/v1/groups` and future member APIs (Phase 3).
 *
 * Uses `group_members` as source of truth: **active** rows only for permission checks;
 * **`pending`** invites do not satisfy `require*` methods unless you widen policy later.
 */
@Injectable()
export class GroupMembershipRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the membership row (any status). Returns `null` if no row.
   */
  async findMembership(userId: string, groupId: string): Promise<GroupMember | null> {
    return this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /** `true` iff there is an **active** membership for this pair. */
  async isActiveMember(userId: string, groupId: string): Promise<boolean> {
    const m = await this.findMembership(userId, groupId);
    return Boolean(m?.status === GroupMemberStatus.active);
  }

  /** `true` iff active member has `owner` or `admin` role. */
  async isAdminOrOwner(userId: string, groupId: string): Promise<boolean> {
    const m = await this.findMembership(userId, groupId);
    if (!m || m.status !== GroupMemberStatus.active) return false;
    return (
      m.role === GroupMemberRole.owner || m.role === GroupMemberRole.admin
    );
  }

  /** `true` iff active member has `owner` role. */
  async isOwner(userId: string, groupId: string): Promise<boolean> {
    const m = await this.findMembership(userId, groupId);
    return Boolean(m?.status === GroupMemberStatus.active && m.role === GroupMemberRole.owner);
  }

  /**
   * Validates the group exists, then ensures the caller is an **active** member.
   * Used for endpoints that require any participant (reads, commenting, …).
   */
  async requireActiveMember(userId: string, groupId: string): Promise<GroupMember> {
    await this.throwIfGroupMissing(groupId);

    const m = await this.findMembership(userId, groupId);
    if (!m || m.status !== GroupMemberStatus.active) {
      throw new NotGroupMemberException();
    }
    return m;
  }

  /**
   * For: add/remove members, edit group metadata, …
   */
  async requireAdminOrOwner(userId: string, groupId: string): Promise<GroupMember> {
    const m = await this.requireActiveMember(userId, groupId);
    if (m.role === GroupMemberRole.member) {
      throw new GroupAdminRequiredException();
    }
    return m;
  }

  /**
   * For: delete group, transfer ownership (when implemented).
   */
  async requireOwner(userId: string, groupId: string): Promise<GroupMember> {
    const m = await this.requireActiveMember(userId, groupId);
    if (m.role !== GroupMemberRole.owner) {
      throw new GroupOwnerRequiredException();
    }
    return m;
  }

  private async throwIfGroupMissing(groupId: string): Promise<void> {
    const exists = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!exists) throw new GroupNotFoundException();
  }
}
