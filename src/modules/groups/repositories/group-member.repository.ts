import { Injectable } from '@nestjs/common';
import type { GroupMember, Prisma } from '@prisma/client';
import { GroupMemberStatus } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { NonOwnerMembershipRole } from '../constants/group-member-role.constants';

/** Membership row loaded with fields needed for public roster shaping. */
const rosterInclude = {
  user: {
    select: {
      id: true,
      avatarUrl: true,
      name: true,
      username: true,
    },
  },
} as const satisfies Prisma.GroupMemberInclude;

export type GroupMemberRosterRow = Prisma.GroupMemberGetPayload<{
  include: typeof rosterInclude;
}>;

const pendingInviteInclude = {
  group: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      type: true,
    },
  },
  addedBy: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  },
} as const satisfies Prisma.GroupMemberInclude;

export type PendingGroupMembershipInviteRow = Prisma.GroupMemberGetPayload<{
  include: typeof pendingInviteInclude;
}>;

const activeMembershipWithGroupInclude = {
  group: {
    select: {
      id: true,
      name: true,
      type: true,
      avatarUrl: true,
      createdByUserId: true,
    },
  },
} as const satisfies Prisma.GroupMemberInclude;

export type ActiveMembershipWithGroupRow = Prisma.GroupMemberGetPayload<{
  include: typeof activeMembershipWithGroupInclude;
}>;

@Injectable()
export class GroupMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.GroupMemberCreateInput): Promise<GroupMember> {
    return this.prisma.groupMember.create({ data });
  }

  async findMembership(
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    return this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /** Count memberships with the given status (e.g. **\`active\`** headcount without loading roster rows). */
  async countWhere(
    groupId: string,
    status: GroupMemberStatus,
  ): Promise<number> {
    return this.prisma.groupMember.count({
      where: { groupId, status },
    });
  }

  /** Hard-delete one membership row. */
  async deleteByComposite(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /** Set \`role\` to \`admin\` or \`member\` (not \`owner\`). */
  async updateRole(
    groupId: string,
    userId: string,
    role: NonOwnerMembershipRole,
  ): Promise<GroupMember> {
    return this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
    });
  }

  /** Set invite to active and stamp \`joinedAt\`. */
  async activateMembership(
    groupId: string,
    userId: string,
  ): Promise<GroupMember> {
    return this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: {
        status: GroupMemberStatus.active,
        joinedAt: new Date(),
      },
    });
  }

  /**
   * All **pending** memberships for **userId** (**inbox**: accept / decline).
   * Newest invitations first (`group_members.createdAt` desc).
   */
  async findPendingMembershipsForUser(
    userId: string,
  ): Promise<PendingGroupMembershipInviteRow[]> {
    return this.prisma.groupMember.findMany({
      where: { userId, status: GroupMemberStatus.pending },
      include: pendingInviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * **Active** memberships for **userId** with group card fields.
   * **Newest `joinedAt` first** (home screen).
   */
  async findActiveMembershipsWithGroupByUserId(
    userId: string,
  ): Promise<ActiveMembershipWithGroupRow[]> {
    return this.prisma.groupMember.findMany({
      where: { userId, status: GroupMemberStatus.active },
      include: activeMembershipWithGroupInclude,
      orderBy: { joinedAt: 'desc' },
    });
  }

  /** All memberships (every status) + user roster fields; sorted for UI lists. */
  async findByGroupIdSorted(groupId: string): Promise<GroupMemberRosterRow[]> {
    const rows = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: rosterInclude,
    });
    const roleRank: Record<GroupMember['role'], number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };
    return rows.slice().sort((a, b) => {
      const dr = roleRank[a.role] - roleRank[b.role];
      if (dr !== 0) return dr;
      const ta = (a.joinedAt ?? a.createdAt).getTime();
      const tb = (b.joinedAt ?? b.createdAt).getTime();
      return ta - tb;
    });
  }

  /**
   * **Contact sync filter (BE Task 5):** among **candidate** user ids, those who are **active** or **pending**
   * in **any group** where **actorUserId** has an **active** membership — i.e. already a **group member** with you,
   * or already has a **pending invite** to one of those groups.
   */
  async findUserIdsWithSharedGroupContext(
    actorUserId: string,
    candidateUserIds: string[],
  ): Promise<Set<string>> {
    if (candidateUserIds.length === 0) {
      return new Set();
    }

    const actorGroups = await this.prisma.groupMember.findMany({
      where: {
        userId: actorUserId,
        status: GroupMemberStatus.active,
      },
      select: { groupId: true },
    });
    const groupIds = [...new Set(actorGroups.map((r) => r.groupId))];
    if (groupIds.length === 0) {
      return new Set();
    }

    const linked = await this.prisma.groupMember.findMany({
      where: {
        groupId: { in: groupIds },
        userId: { in: candidateUserIds },
        status: {
          in: [GroupMemberStatus.active, GroupMemberStatus.pending],
        },
      },
      select: { userId: true },
    });

    const out = new Set<string>();
    for (const row of linked) {
      out.add(row.userId);
    }
    return out;
  }
}
