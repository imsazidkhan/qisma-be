import { Injectable } from '@nestjs/common';
import type { Group } from '@prisma/client';
import {
  GroupActivityEventType,
  GroupMemberRole,
  GroupMemberStatus,
  Prisma as PrismaClient,
} from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import {
  AccountInactiveException,
  AdminRemoveRequiresOwnerException,
  GroupInvitePreviewNotPendingException,
  GroupMemberConflictException,
  GroupMemberNotFoundException,
  GroupNotFoundException,
  GroupOwnerProtectedException,
  GroupInviteNotPendingException,
  InviteAlreadyPendingException,
  InviteSelfForbiddenException,
  NotGroupMemberException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { UserService } from '../user/user.service';
import { GROUP_CONSTANTS } from './constants/group.constants';
import { GROUP_INVITE_CONSTANTS } from './constants/group-invite.constants';
import type { NonOwnerMembershipRole } from './constants/group-member-role.constants';
import { GroupMembershipRulesService } from './permissions/group-membership-rules.service';
import { GroupInviteRepository } from './repositories/group-invite.repository';
import { GroupActivityRepository } from './repositories/group-activity.repository';
import {
  type GroupMemberRosterRow,
  GroupMemberRepository,
} from './repositories/group-member.repository';
import { GroupRepository } from './repositories/group.repository';
import { normalizeInvitePhone } from './utils/invite-phone';
import {
  ANALYTICS_EVENT,
  INVITE_CONVERSION_CHANNEL,
} from '../../common/analytics/analytics-log.constants';

/**
 * Groups & membership, including invitations.
 *
 * **BE Task 11:** **pending** **`group_members`** (**`GET …/users/me/group-invites`**, **accept** / **decline**),
 * **offline** **`group_invites`** ( **`POST …/members`** → **`POST /v1/otp/verify`** → **pending** **`group_members`** + **accept** / **decline** ),
 * prevention (**`INVITE_ALREADY_PENDING`**, **`ALREADY_GROUP_MEMBER`**, **`P2002`**, **`group_invites`** unique **groupId+phone**),
 * and **BE Task 14** **`group_activity_events`** (**`invite_sent`**, **`invite_accepted`**, **`member_joined`**).
 */
@Injectable()
export class GroupsService {
  constructor(
    private readonly groups: GroupRepository,
    private readonly groupMembers: GroupMemberRepository,
    private readonly groupInvites: GroupInviteRepository,
    private readonly groupActivity: GroupActivityRepository,
    private readonly users: UserService,
    private readonly membershipRules: GroupMembershipRulesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GroupsService.name);
  }

  async createForUser(
    userId: string,
    input: {
      name: string;
      type: string;
      avatarUrl?: string;
    },
  ): Promise<Group> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    return this.groups.createWithOwnerMembership({
      ownerUserId: userId,
      name: input.name,
      type: input.type,
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    });
  }

  async findById(id: string): Promise<Group | null> {
    return this.groups.findById(id);
  }

  /** Groups created by this user (newest first). Validates user exists and is active. */
  async listMine(userId: string): Promise<Group[]> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    return this.groups.findByCreatorUserId(userId);
  }

  /** Single group by id when it belongs to the given user. */
  async getMineById(userId: string, groupId: string): Promise<Group> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group || group.createdByUserId !== userId) {
      throw new GroupNotFoundException();
    }
    return group;
  }

  /**
   * **Option B:** full **`Group`** row for **any `group_members` with `status` active** (invited members + owner).
   * Distinct from **{@link getMineById}** (creator-only). Pending invitees → **invite-preview** or inbox.
   */
  async getGroupProfileForActiveMember(
    userId: string,
    groupId: string,
  ): Promise<Group> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    await this.membershipRules.requireActiveMember(userId, groupId);

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }
    return group;
  }

  /** Deletes the group if it exists and belongs to the user. */
  async deleteMine(userId: string, groupId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    await this.membershipRules.requireOwner(userId, groupId);
    try {
      await this.groups.deleteById(groupId);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupNotFoundException();
      }
      throw error;
    }
  }

  /**
   * After OTP verify: **materializes** non-expired **`group_invites`** for this phone into **`group_members`**
   * **`pending`** ( **`joinedAt`** **`null`** ) — invitee accepts via **`POST …/invites/accept`**.
   */
  async claimPendingPhoneInvitesAfterSignup(
    userId: string,
    normalizedPhone: string,
  ): Promise<number> {
    const outcomes = await this.groupInvites.claimPendingForNewUser(
      normalizedPhone,
      userId,
    );

    return outcomes.length;
  }

  /**
   * **BE Task 10 (Group invite system):** `POST /v1/groups/:groupId/members` —
   * sends a **pending** invite: **`group_members` `pending`** for an **existing** user (**`identifier`**
   * / **`username`** / **`userId`**), or **`group_invites`** upsert for **phone-only** targets with no
   * **`users`** row yet (**materialized at **`/v1/otp/verify`** as **`group_members`** **pending**, then accept/decline).
   */
  async addMember(
    actorUserId: string,
    groupId: string,
    input: {
      identifier?: string;
      username?: string;
      userId?: string;
    },
  ): Promise<GroupMemberRosterRow[]> {
    const actor = await this.users.findById(actorUserId);
    if (!actor) {
      throw new UserNotFoundException();
    }
    if (!actor.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    await this.membershipRules.requireAdminOrOwner(actorUserId, groupId);

    let target: Awaited<ReturnType<UserService['findById']>> | null = null;

    if (input.identifier !== undefined) {
      const normalized = normalizeInvitePhone(input.identifier);
      target = await this.users.findByIdentifier(normalized);

      if (!target) {
        if (normalized.length === 0) {
          throw new UserNotFoundException(
            'No user matched the given phone, username, or user id.',
          );
        }
        if (normalized === normalizeInvitePhone(actor.identifier)) {
          throw new InviteSelfForbiddenException();
        }
        const expiresAt = new Date(Date.now() + GROUP_INVITE_CONSTANTS.TTL_MS);
        await this.groupInvites.upsertPendingPhoneInvite({
          groupId,
          phone: normalized,
          invitedByUserId: actorUserId,
          expiresAt,
        });
        await this.tryEmitInviteSent({
          groupId,
          actorUserId,
          inviteeUserId: null,
          offlinePhoneInvite: true,
        });
        return this.groupMembers.findByGroupIdSorted(groupId);
      }
    } else if (input.username !== undefined) {
      target = await this.users.findByUsername(input.username);
    } else if (input.userId !== undefined) {
      target = await this.users.findById(input.userId);
    } else {
      throw new UserNotFoundException(
        'No user matched the given phone, username, or user id.',
      );
    }

    if (!target) {
      throw new UserNotFoundException(
        'No user matched the given phone, username, or user id.',
      );
    }
    if (!target.isActive) {
      throw new AccountInactiveException('That account cannot be invited.');
    }
    if (target.id === actorUserId) {
      throw new InviteSelfForbiddenException();
    }

    await this.groupInvites.deleteByGroupAndPhone(groupId, target.identifier);

    const existing = await this.groupMembers.findMembership(groupId, target.id);
    if (existing) {
      if (existing.status === GroupMemberStatus.pending) {
        throw new InviteAlreadyPendingException();
      }
      throw new GroupMemberConflictException();
    }

    try {
      await this.groupMembers.create({
        group: { connect: { id: groupId } },
        user: { connect: { id: target.id } },
        role: GroupMemberRole.member,
        status: GroupMemberStatus.pending,
        joinedAt: null,
        addedBy: { connect: { id: actorUserId } },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new GroupMemberConflictException();
      }
      throw error;
    }

    await this.tryEmitInviteSent({
      groupId,
      actorUserId,
      inviteeUserId: target.id,
      offlinePhoneInvite: false,
    });

    return this.groupMembers.findByGroupIdSorted(groupId);
  }

  /**
   * **BE Task 12:** Backing method for **`GET /v1/users/me/group-invites`** — inbox of **pending**
   * **`group_members`** (**accept** / **decline**). Includes rows materialized from **`group_invites`**
   * after **`/v1/otp/verify`** (offline phone invite before signup). **`group_invites`** itself is not serialized.
   * Newest first.
   */
  async listPendingInvitesForUser(userId: string): Promise<
    {
      groupId: string;
      groupName: string;
      groupAvatar: string | null;
      groupType: string;
      role: GroupMemberRole;
      invitedAt: Date;
      invitedBy: {
        userId: string;
        name: string | null;
        username: string | null;
        avatar: string | null;
      } | null;
    }[]
  > {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const rows = await this.groupMembers.findPendingMembershipsForUser(userId);
    return rows.map((row) => ({
      groupId: row.groupId,
      groupName: row.group.name,
      groupAvatar: row.group.avatarUrl,
      groupType: row.group.type,
      role: row.role,
      invitedAt: row.createdAt,
      invitedBy: row.addedBy
        ? {
            userId: row.addedBy.id,
            name: row.addedBy.name,
            username: row.addedBy.username,
            avatar: row.addedBy.avatarUrl,
          }
        : null,
    }));
  }

  /**
   * **Home / “my groups”:** every **`group_members`** row for this user with **`active`** status,
   * with slim **group** card + **`isCreator`**. **Pending** invites stay on **`GET …/me/group-invites`**.
   * Sorted **newest `joinedAt` first**.
   */
  async listMyActiveGroups(userId: string): Promise<
    {
      groupId: string;
      group: {
        id: string;
        name: string;
        type: string;
        avatar: string | null;
      };
      role: GroupMemberRole;
      joinedAt: Date;
      isCreator: boolean;
    }[]
  > {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const rows =
      await this.groupMembers.findActiveMembershipsWithGroupByUserId(userId);

    return rows.map((row) => {
      const g = row.group;
      const joinedAt = row.joinedAt ?? row.createdAt;
      return {
        groupId: row.groupId,
        group: {
          id: g.id,
          name: g.name,
          type: g.type,
          avatar: g.avatarUrl,
        },
        role: row.role,
        joinedAt,
        isCreator: g.createdByUserId === userId,
      };
    });
  }

  /**
   * Minimal group snapshot (**\`id\`**, **name**, **type**, **avatar**, **active \`memberCount\`**).
   * Only callers with **`group_members`.`status === pending`** for this group (**Phase C** inbox preview).
   * Does **not** expose roster identities, roles beyond your own invite, or creator timestamps.
   */
  async getInvitePreviewForPendingInvitee(
    userId: string,
    groupId: string,
  ): Promise<{
    id: string;
    name: string;
    type: string;
    avatar: string | null;
    memberCount: number;
  }> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    const row = await this.groupMembers.findMembership(groupId, userId);
    if (!row) {
      throw new GroupMemberNotFoundException(
        'You have no invitation to this group.',
      );
    }
    if (row.status !== GroupMemberStatus.pending) {
      throw new GroupInvitePreviewNotPendingException();
    }

    const memberCount = await this.groupMembers.countWhere(
      groupId,
      GroupMemberStatus.active,
    );

    return {
      id: group.id,
      name: group.name,
      type: group.type,
      avatar: group.avatarUrl,
      memberCount,
    };
  }

  /**
   * All memberships for **UI roster** (`owner` → `admin` → `member`, then join time).
   * Caller must be an **active** member of the group (any role).
   */
  async listMembers(
    userId: string,
    groupId: string,
  ): Promise<GroupMemberRosterRow[]> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    await this.membershipRules.requireActiveMember(userId, groupId);
    return this.groupMembers.findByGroupIdSorted(groupId);
  }

  /**
   * **BE Task 15:** **`GET /v1/groups/:groupId/activity`** —
   * **`group_activity_events`** for this group (**newest first**, capped).
   *
   * **Authorization:** bearer must be **`active`** (**`403 NOT_GROUP_MEMBER`** if pending-only or absent).
   */
  async listGroupActivity(
    userId: string,
    groupId: string,
  ): Promise<
    {
      id: string;
      type: GroupActivityEventType;
      createdAt: Date;
      actor: {
        id: string;
        name: string | null;
        username: string | null;
        avatar: string | null;
      } | null;
      subject: {
        id: string;
        name: string | null;
        username: string | null;
        avatar: string | null;
      } | null;
      payload: Record<string, unknown> | null;
    }[]
  > {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    await this.membershipRules.requireActiveMember(userId, groupId);

    const rows = await this.groupActivity.findRecentByGroupId(
      groupId,
      GROUP_CONSTANTS.ACTIVITY_FEED_MAX,
    );

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      actor: GroupsService.activityFeedUser(r.actor),
      subject: GroupsService.activityFeedUser(r.subject),
      payload: GroupsService.normalizeActivityPayload(r.payload),
    }));
  }

  /**
   * Removes one membership (**admin / owner callers only** — **`member`** callers get **`GROUP_ADMIN_REQUIRED`**).
   * **Cannot remove** **`owner`** row (**`GROUP_OWNER_PROTECTED`**). **Missing** target row → **`GROUP_MEMBER_NOT_FOUND`**.
   * **Admin** cannot remove another **admin** unless caller is **owner**; an admin may remove **their own** row.
   * Response: roster after delete (same shape as **GET** / POST add-member).
   */
  async removeMember(
    actorUserId: string,
    groupId: string,
    memberId: string,
  ): Promise<GroupMemberRosterRow[]> {
    const actor = await this.users.findById(actorUserId);
    if (!actor) {
      throw new UserNotFoundException();
    }
    if (!actor.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    const actorRow = await this.membershipRules.requireAdminOrOwner(
      actorUserId,
      groupId,
    );

    const targetRow = await this.groupMembers.findMembership(groupId, memberId);
    if (!targetRow) {
      throw new GroupMemberNotFoundException();
    }

    if (targetRow.role === GroupMemberRole.owner) {
      throw new GroupOwnerProtectedException();
    }

    if (
      targetRow.role === GroupMemberRole.admin &&
      actorRow.role !== GroupMemberRole.owner &&
      actorUserId !== memberId
    ) {
      throw new AdminRemoveRequiresOwnerException();
    }

    try {
      await this.groupMembers.deleteByComposite(groupId, memberId);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupMemberNotFoundException();
      }
      throw error;
    }

    return this.groupMembers.findByGroupIdSorted(groupId);
  }

  /**
   * Owner-only: **promote** a **member** to **\`admin\`** (\`role: "admin"\`) or **demote** an **admin** to **\`member\`** (\`role: "member"\`).
   * The **\`owner\`** row is never updated here (**\`GROUP_OWNER_PROTECTED\`**).
   *
   * Non-owners (including **admins**) → **\`403 GROUP_OWNER_REQUIRED\`**. Returns full sorted roster.
   */
  async updateMemberRole(
    actorUserId: string,
    groupId: string,
    memberId: string,
    role: NonOwnerMembershipRole,
  ): Promise<GroupMemberRosterRow[]> {
    const actor = await this.users.findById(actorUserId);
    if (!actor) {
      throw new UserNotFoundException();
    }
    if (!actor.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    await this.membershipRules.requireOwner(actorUserId, groupId);

    const targetRow = await this.groupMembers.findMembership(groupId, memberId);
    if (!targetRow) {
      throw new GroupMemberNotFoundException();
    }
    if (targetRow.status !== GroupMemberStatus.active) {
      throw new NotGroupMemberException(
        'That user is not an active member of this group.',
      );
    }

    if (targetRow.role === GroupMemberRole.owner) {
      throw new GroupOwnerProtectedException(
        'The group owner role cannot be changed this way. Transfer ownership when supported.',
      );
    }

    if (targetRow.role === role) {
      return this.groupMembers.findByGroupIdSorted(groupId);
    }

    try {
      await this.groupMembers.updateRole(groupId, memberId, role);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupMemberNotFoundException();
      }
      throw error;
    }

    return this.groupMembers.findByGroupIdSorted(groupId);
  }

  /**
   * **BE Task 13 (accept path):** **`POST /v1/groups/:groupId/invites/accept`** — invitee **`pending`** → **`active`** + **`joinedAt`**.
   * Idempotent: if already **`active`**, returns current roster without mutation.
   */
  async acceptGroupInvite(
    inviteeUserId: string,
    groupId: string,
  ): Promise<GroupMemberRosterRow[]> {
    const user = await this.users.findById(inviteeUserId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    const row = await this.groupMembers.findMembership(groupId, inviteeUserId);
    if (!row) {
      throw new GroupMemberNotFoundException();
    }

    if (row.status === GroupMemberStatus.active) {
      return this.groupMembers.findByGroupIdSorted(groupId);
    }

    if (row.status !== GroupMemberStatus.pending) {
      throw new GroupInviteNotPendingException();
    }

    try {
      await this.groupMembers.activateMembership(groupId, inviteeUserId);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupMemberNotFoundException();
      }
      throw error;
    }

    await Promise.all([
      this.tryEmitInviteAccepted(
        groupId,
        inviteeUserId,
        row.addedByUserId ?? null,
      ),
      this.tryEmitMemberJoined(groupId, inviteeUserId),
    ]);

    this.logger.info({
      msg: ANALYTICS_EVENT.INVITE_CONVERSION,
      analyticsEvent: ANALYTICS_EVENT.INVITE_CONVERSION,
      inviteChannel: INVITE_CONVERSION_CHANNEL.ACCEPT_PENDING_MEMBER,
      userId: inviteeUserId,
      groupId,
    });

    return this.groupMembers.findByGroupIdSorted(groupId);
  }

  /**
   * **BE Task 13 (decline path):** **`POST /v1/groups/:groupId/invites/decline`** — deletes **pending** **`group_members`** invitee row.
   */
  async declineGroupInvite(
    inviteeUserId: string,
    groupId: string,
  ): Promise<void> {
    const user = await this.users.findById(inviteeUserId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException();
    }

    const row = await this.groupMembers.findMembership(groupId, inviteeUserId);
    if (!row) {
      throw new GroupMemberNotFoundException();
    }

    if (row.status === GroupMemberStatus.active) {
      throw new GroupInviteNotPendingException(
        'You are already an active member of this group.',
      );
    }

    if (row.status !== GroupMemberStatus.pending) {
      throw new GroupInviteNotPendingException();
    }

    try {
      await this.groupMembers.deleteByComposite(groupId, inviteeUserId);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClient.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupMemberNotFoundException();
      }
      throw error;
    }
  }

  private static activityFeedUser(
    row:
      | {
          id: string;
          name: string | null;
          username: string | null;
          avatarUrl: string | null;
        }
      | null,
  ): {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null {
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      avatar: row.avatarUrl,
    };
  }

  private static normalizeActivityPayload(
    value: PrismaClient.JsonValue | null | undefined,
  ): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  /** **BE Task 14:** Best-effort append to **`group_activity_events`** (`invite_sent`). */
  private async tryEmitInviteSent(params: {
    groupId: string;
    actorUserId: string;
    inviteeUserId: string | null;
    offlinePhoneInvite: boolean;
  }): Promise<void> {
    try {
      const base = {
        groupId: params.groupId,
        type: GroupActivityEventType.invite_sent,
        actorUserId: params.actorUserId,
        subjectUserId: params.inviteeUserId,
      };
      await this.groupActivity.create(
        params.offlinePhoneInvite
          ? { ...base, payload: { offlinePhoneInvite: true } }
          : base,
      );
    } catch (err: unknown) {
      this.logger.warn({
        err,
        msg: 'group_activity_emit_failed',
        groupId: params.groupId,
        eventType: GroupActivityEventType.invite_sent,
      });
    }
  }

  private async tryEmitInviteAccepted(
    groupId: string,
    inviteeUserId: string,
    inviterUserId: string | null,
  ): Promise<void> {
    try {
      await this.groupActivity.create({
        groupId,
        type: GroupActivityEventType.invite_accepted,
        actorUserId: inviteeUserId,
        subjectUserId: inviterUserId,
      });
    } catch (err: unknown) {
      this.logger.warn({
        err,
        msg: 'group_activity_emit_failed',
        groupId,
        eventType: GroupActivityEventType.invite_accepted,
      });
    }
  }

  /** **BE Task 14:** User became an active member (paired with **`invite_accepted`** where applicable). */
  private async tryEmitMemberJoined(
    groupId: string,
    memberUserId: string,
  ): Promise<void> {
    try {
      await this.groupActivity.create({
        groupId,
        type: GroupActivityEventType.member_joined,
        actorUserId: memberUserId,
      });
    } catch (err: unknown) {
      this.logger.warn({
        err,
        msg: 'group_activity_emit_failed',
        groupId,
        eventType: GroupActivityEventType.member_joined,
      });
    }
  }
}
