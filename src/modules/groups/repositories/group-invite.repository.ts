import { Injectable } from '@nestjs/common';
import type { GroupInvite, Prisma } from '@prisma/client';
import { GroupInviteStatus, GroupMemberRole, GroupMemberStatus } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

/** Offline **`group_invites`** removed and represented as **`group_members`** **pending** (user accepts later). */
export type ClaimedPhoneInviteOutcome = {
  groupId: string;
  inviterUserId: string | null;
  inviteeUserId: string;
};

@Injectable()
export class GroupInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One row per (\`groupId\`, \`phone\`). Reactivates \`pending\` with a fresh \`expiresAt\`
   * if the row was \`accepted\` / \`expired\` / \`revoked\`.
   */
  async upsertPendingPhoneInvite(params: {
    groupId: string;
    phone: string;
    invitedByUserId: string;
    expiresAt: Date;
  }): Promise<GroupInvite> {
    return this.prisma.groupInvite.upsert({
      where: {
        groupId_phone: { groupId: params.groupId, phone: params.phone },
      },
      create: {
        group: { connect: { id: params.groupId } },
        phone: params.phone,
        invitedBy: { connect: { id: params.invitedByUserId } },
        status: GroupInviteStatus.pending,
        expiresAt: params.expiresAt,
      },
      update: {
        status: GroupInviteStatus.pending,
        expiresAt: params.expiresAt,
        invitedBy: { connect: { id: params.invitedByUserId } },
      },
    });
  }

  /** Remove stale \`group_invites\` row once a registered user receives a membership. */
  async deleteByGroupAndPhone(groupId: string, phone: string): Promise<void> {
    await this.prisma.groupInvite.deleteMany({
      where: { groupId, phone },
    });
  }

  /**
   * Materializes **`group_invites`** into **`group_members`** **pending** (same UX as invites to registered users).
   * Deletes each processed invite row; invitee **`POST …/invites/accept`** → active + **`joinedAt`**.
   */
  async claimPendingForNewUser(
    normalizedPhone: string,
    userId: string,
  ): Promise<ClaimedPhoneInviteOutcome[]> {
    const outcomes: ClaimedPhoneInviteOutcome[] = [];
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const invites = await tx.groupInvite.findMany({
        where: {
          phone: normalizedPhone,
          status: GroupInviteStatus.pending,
          expiresAt: { gt: now },
        },
      });

      for (const inv of invites) {
        const existing = await tx.groupMember.findUnique({
          where: {
            groupId_userId: { groupId: inv.groupId, userId },
          },
        });

        if (!existing) {
          const memberData: Prisma.GroupMemberCreateInput = {
            group: { connect: { id: inv.groupId } },
            user: { connect: { id: userId } },
            role: GroupMemberRole.member,
            status: GroupMemberStatus.pending,
            joinedAt: null,
          };
          if (inv.invitedByUserId) {
            memberData.addedBy = { connect: { id: inv.invitedByUserId } };
          }
          await tx.groupMember.create({ data: memberData });
          outcomes.push({
            groupId: inv.groupId,
            inviterUserId: inv.invitedByUserId,
            inviteeUserId: userId,
          });
        }

        await tx.groupInvite.delete({
          where: { id: inv.id },
        });
      }
    });
    return outcomes;
  }
}
