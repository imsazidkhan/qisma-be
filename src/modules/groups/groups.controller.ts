import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Group } from '@prisma/client';
import type { Request } from 'express';

import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnauthorizedException } from '../../common/exceptions/api.exception';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { PatchGroupMemberRoleDto } from './dto/patch-group-member-role.dto';
import {
  GroupDataDto,
  GroupDeleteDataDto,
  GroupDeleteResponseDto,
  GroupDetailResponseDto,
  GroupInviteDeclinedDataDto,
  GroupInviteDeclinedResponseDto,
  GroupInvitePreviewDataDto,
  GroupInvitePreviewResponseDto,
  GroupListResponseDto,
  GroupMemberListResponseDto,
  GroupMemberProfileResponseDto,
  GroupMemberRosterEntryDto,
} from './dto/group-responses.dto';
import {
  GroupActivityEventEntryDto,
  GroupActivityListResponseDto,
  GroupActivityUserSnippetDto,
} from './dto/group-activity-responses.dto';
import { GROUP_CONSTANTS } from './constants/group.constants';
import { GROUP_TYPE_SLUGS } from './constants/group-type.constants';
import { GroupsService } from './groups.service';
import type { GroupMemberRosterRow } from './repositories/group-member.repository';

function groupMemberRowToRosterDto(
  row: GroupMemberRosterRow,
): GroupMemberRosterEntryDto {
  return {
    id: row.user.id,
    avatar: row.user.avatarUrl,
    name: row.user.name,
    username: row.user.username ?? null,
    role: row.role,
    status: row.status,
    joinedAt: row.joinedAt,
  };
}

function groupToDataDto(group: Group): GroupDataDto {
  return {
    id: group.id,
    name: group.name,
    type: group.type,
    avatar: group.avatarUrl,
    createdByUserId: group.createdByUserId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function groupInvitePreviewToDto(
  preview: Awaited<
    ReturnType<GroupsService['getInvitePreviewForPendingInvitee']>
  >,
): GroupInvitePreviewDataDto {
  return {
    id: preview.id,
    name: preview.name,
    type: preview.type,
    avatar: preview.avatar,
    memberCount: preview.memberCount,
  };
}

function groupActivityEntryToDto(
  row: Awaited<ReturnType<GroupsService['listGroupActivity']>>[number],
): GroupActivityEventEntryDto {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt,
    actor: row.actor,
    subject: row.subject,
    payload: row.payload,
  };
}

function authContextOrThrow(req: Request): {
  userId: string;
  identifier: string;
} {
  const authUser = req.user as
    | { userId: string; identifier: string }
    | undefined;
  if (!authUser?.userId) {
    throw new UnauthorizedException(
      'Authentication context missing after guard.',
    );
  }
  return authUser;
}

@ApiTags('Groups')
@ApiExtraModels(
  ApiErrorDto,
  AddGroupMemberDto,
  PatchGroupMemberRoleDto,
  CreateGroupDto,
  GroupDetailResponseDto,
  GroupListResponseDto,
  GroupDeleteResponseDto,
  GroupDeleteDataDto,
  GroupDataDto,
  GroupInviteDeclinedDataDto,
  GroupInviteDeclinedResponseDto,
  GroupMemberListResponseDto,
  GroupMemberRosterEntryDto,
  GroupInvitePreviewDataDto,
  GroupInvitePreviewResponseDto,
  GroupMemberProfileResponseDto,
  GroupActivityEventEntryDto,
  GroupActivityListResponseDto,
  GroupActivityUserSnippetDto,
)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List groups I created (authenticated)',
    description: `
Returns groups **created by** the authenticated user (same owner as \`POST /v1/groups\`), ordered by **\`createdAt\` descending** — newest first.

### Auth
- **Bearer access token** only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`)

### Response (\`200\`)
\`{ "success": true, "data": [...] }\` where \`data\` is an array of group objects. **Empty array** when you have not created any groups yet.
`,
  })
  @ApiOkResponse({
    description:
      '`200 OK` — array of groups you created (`data` may be empty).',
    type: GroupListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async listMine(
    @Req() req: Request,
  ): Promise<ApiSuccessResponse<GroupDataDto[]>> {
    const { userId } = authContextOrThrow(req);
    const rows = await this.groups.listMine(userId);
    return {
      success: true,
      data: rows.map(groupToDataDto),
    };
  }

  @Get(':groupId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List group members (authenticated, active member)',
    description: `
Returns one **roster row per membership** (**\`active\`** and **\`pending\`** invites) with fields \`id\` (user), \`avatar\`, \`name\`, \`username\`, \`role\`, **\`status\`**, \`joinedAt\` — sorted **owner → admin → member**, then join/create time.

### Frontend usage
Typical callers: **group details page**, **member modal**, **expense split selector** — use **\`status\`** for pending-invite badges; \`joinedAt\` is \`null\` until invite is accepted.

The caller must have an **active** membership (**any role**).

- **Success:** **\`200\`** — **\`success: true\`** and **\`data\`** roster array (**\`GroupMemberRosterEntryDto[]\`**)
- **\`403\`** — **\`NOT_GROUP_MEMBER\`** (not active in group, or invite still \`pending\`), or **\`ACCOUNT_INACTIVE\`**
- **\`404\`** — **\`GROUP_NOT_FOUND\`** (missing group); **\`USER_NOT_FOUND\`** (JWT user missing row)

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group whose members to list',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupMemberRosterEntryDto[] }` (sorted roster).',
    type: GroupMemberListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`NOT_GROUP_MEMBER` or `ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '`USER_NOT_FOUND` or `GROUP_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async listMembers(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupMemberRosterEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const members = await this.groups.listMembers(userId, groupId);
    return {
      success: true,
      data: members.map(groupMemberRowToRosterDto),
    };
  }

  /** BE Task 15 — `GET /v1/groups/:groupId/activity` */
  @Get(':groupId/activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Group activity feed (authenticated, active member)',
    description: `
Returns **\`group_activity_events\`** for this group (**newest \`createdAt\` first**), up to **${String(GROUP_CONSTANTS.ACTIVITY_FEED_MAX)}** rows.

Each item includes **\`type\`** (**\`member_joined\`** | **\`invite_sent\`** | **\`invite_accepted\`**), timestamps, **\`actor\`** / **\`subject\`** user snippets (when set), and optional **\`payload\`** (never raw phone digits).

- **Caller** must have an **\`active\`** \`group_members\` row (**\`403 NOT_GROUP_MEMBER\`** if only **pending** or absent).
- **Empty \`data\`:** normal when no events were recorded yet.

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group whose activity feed to read',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupActivityEventEntryDto[] }`',
    type: GroupActivityListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`NOT_GROUP_MEMBER` or `ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '`USER_NOT_FOUND` or `GROUP_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async listGroupActivity(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupActivityEventEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const rows = await this.groups.listGroupActivity(userId, groupId);
    return {
      success: true,
      data: rows.map(groupActivityEntryToDto),
    };
  }

  @Get(':groupId/invite-preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Minimal group preview (authenticated, **pending invitee** only — Phase C)',
    description: `
Returns **\`id\`**, **name**, **type**, **avatar**, and **\`memberCount\`** (\`COUNT\` of **\`active\`** \`group_members\` only).

- **Who may call:** bearer user has a **\`group_members\`** row for this \`groupId\` with **\`status: pending\`**.
- **Already \`active\`** in the group → **\`403 GROUP_INVITE_PREVIEW_NOT_PENDING\`** (use **\`GET\` …\`/members\`** after join).
- **No membership row** for you → **\`404 GROUP_MEMBER_NOT_FOUND\`**
- **Unknown \`groupId\`** → **\`404 GROUP_NOT_FOUND\`**

Does **not** return roster, per-user roles other than implied by your invite, \`createdBy\`, or timestamps.

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group you have a **pending** invitation to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupInvitePreviewDataDto }`',
    type: GroupInvitePreviewResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`ACCOUNT_INACTIVE` or `GROUP_INVITE_PREVIEW_NOT_PENDING`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      '`USER_NOT_FOUND`, `GROUP_NOT_FOUND`, or `GROUP_MEMBER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async getInvitePreview(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupInvitePreviewDataDto>> {
    const { userId } = authContextOrThrow(req);
    const preview = await this.groups.getInvitePreviewForPendingInvitee(
      userId,
      groupId,
    );
    return {
      success: true,
      data: groupInvitePreviewToDto(preview),
    };
  }

  /**
   * **BE Task 13:** **`POST /v1/groups/:groupId/invites/accept`** —
   * **`group_members`** **pending → active** + **`joinedAt`** (**idempotent** if already active). Maps **`acceptGroupInvite`**.
   */
  @Post(':groupId/invites/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept a pending group invite (authenticated invitee)',
    description: `
Flips **your** **\`group_members\`** row from **\`pending\` → \`active\`** and sets **\`joinedAt\`** to now.

**Offline-phone path:** **\`group_invites\`** become **\`group_members\` \`pending\`** at **\`/v1/otp/verify\`** (invite row removed). Use this endpoint to confirm — same as invites to users who were already registered.

**Idempotent:** if you are already **\`active\`**, responds **\`200\`** with the current roster (**no-op**).

- **\`404\`** — no \`group_members\` row for you + group

### Auth
Bearer access token (**invitee only**).

### Frontend
Poll or refresh **GET** roster after accept.
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group you were invited to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — full roster `{ success: true, data: GroupMemberRosterEntryDto[] }`',
    type: GroupMemberListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '`GROUP_INVITE_NOT_PENDING`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      '`GROUP_MEMBER_NOT_FOUND`, `GROUP_NOT_FOUND`, or `USER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async acceptInvite(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupMemberRosterEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const members = await this.groups.acceptGroupInvite(userId, groupId);
    return {
      success: true,
      data: members.map(groupMemberRowToRosterDto),
    };
  }

  /**
   * **BE Task 13:** **`POST /v1/groups/:groupId/invites/decline`** —
   * deletes **pending** **`group_members`** row for the invitee. Maps **`declineGroupInvite`**.
   */
  @Post(':groupId/invites/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline a pending group invite (authenticated invitee)',
    description: `
Deletes **your** **\`pending\`** \`group_members\` row. **Already \`active\`** → **\`400 GROUP_INVITE_NOT_PENDING\`**.

Invitees cancel from notification / inbox UX; admins can **DELETE** pending users via existing remove-member if needed.

### Auth
Bearer access token (**invitee only**).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group whose pending invite you are declining',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '`200 OK` — `{ success: true, data: { groupId } }`',
    type: GroupInviteDeclinedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '`GROUP_INVITE_NOT_PENDING` (e.g. already active)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      '`GROUP_MEMBER_NOT_FOUND`, `GROUP_NOT_FOUND`, or `USER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async declineInvite(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<{ groupId: string }>> {
    const { userId } = authContextOrThrow(req);
    await this.groups.declineGroupInvite(userId, groupId);
    return {
      success: true,
      data: { groupId },
    };
  }

  @Get(':groupId/member-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Get group metadata as an active member (Option B — distinct from creator-only GET)',
    description: `
Returns the same **\`GroupDataDto\`** shape as **\`GET /v1/groups/:groupId\`** (creator-only), but authorized for **any user with an \`active\` \`group_members\` row** for this \`groupId\` — including people who **joined via invite**.

- **Use this** from the mobile **group detail** screen after the user is **active** (same moment **\`GET …/members\`** is allowed).
- **\`GET /v1/groups/:groupId\`** remains **creator-only** (aligns with **\`GET /v1/groups\`** “groups I created”).
- **\`403 NOT_GROUP_MEMBER\`** — no row, or **\`pending\`** invite only (**\`invite-preview\`** or inbox until **accept**).
- **\`404 GROUP_NOT_FOUND\`** — bad id.

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group you are an **active** member of',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupDataDto }` (same fields as creator detail route).',
    type: GroupMemberProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      '`ACCOUNT_INACTIVE` or `NOT_GROUP_MEMBER` (not active in this group)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '`USER_NOT_FOUND` or `GROUP_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async getGroupMemberProfile(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupDataDto>> {
    const { userId } = authContextOrThrow(req);
    const group = await this.groups.getGroupProfileForActiveMember(
      userId,
      groupId,
    );
    return {
      success: true,
      data: groupToDataDto(group),
    };
  }

  @Get(':groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get one group by id (authenticated, owner only)',
    description: `
Returns full details for a single group **only if** the authenticated user is its creator (same visibility as listing \`GET /v1/groups\`).

If the id does not exist or belongs to someone else, the response is **\`404 GROUP_NOT_FOUND\`** (enumeration-safe).

### Auth
- **Bearer access token** only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`)
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Primary key of the group',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '`200 OK` — same `GroupDataDto` envelope as create.',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found, or group not found / not owned by you',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async getMineById(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupDataDto>> {
    const { userId } = authContextOrThrow(req);
    const group = await this.groups.getMineById(userId, groupId);
    return {
      success: true,
      data: groupToDataDto(group),
    };
  }

  @Delete(':groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a group (authenticated, owner membership only)',
    description: `
Permanently removes the group row **only if** the authenticated user has an **active** \`owner\` row in \`group_members\` for this group.

- **Success:** \`200\` with \`data.deletedGroupId\` set to the path id.
- **\`403\`:** \`GROUP_OWNER_REQUIRED\`, \`NOT_GROUP_MEMBER\` (wrong role / not invited), or **\`ACCOUNT_INACTIVE\`**
- **\`404 GROUP_NOT_FOUND\`:** Unknown group id, or concurrent delete (**\`P2025\`**) mapped for clients.
- **Idempotent-ish:** repeating delete after success yields **\`404\`**.

### Auth
- **Bearer access token** only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`)
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Primary key of the group to delete',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — group deleted; use `deletedGroupId` to update client cache.',
    type: GroupDeleteResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      '`ACCOUNT_INACTIVE`, `NOT_GROUP_MEMBER`, or `GROUP_OWNER_REQUIRED` (must be active owner)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found, or group not found / already deleted',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async deleteMine(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupDeleteDataDto>> {
    const { userId } = authContextOrThrow(req);
    await this.groups.deleteMine(userId, groupId);
    return {
      success: true,
      data: { deletedGroupId: groupId },
    };
  }

  @Post(':groupId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite a user (pending — authenticated admin or owner)',
    description: `
**Registered user** (\`identifier\` finds \`users\`, or \`username\` / \`userId\`): inserts **\`group_members\` \`pending\`** (**\`joinedAt\`**: \`null\`); clears any **\`group_invites\`** row for the same normalized phone.

**Unregistered phone** (\`identifier\` only, no \`users\` row): upserts **\`group_invites\`** (\`pending\`, \`invitedBy\`, \`expiresAt\` ~**14 days** — see \`GROUP_INVITE_CONSTANTS\`). **Same \`201\` roster** until they sign up. After **OTP verify**, matching **\`group_invites\`** are **removed** and **\`group_members\` \`pending\`** rows are created (**\`joinedAt\`**: **\`null\`**); invitee uses **\`POST …/invites/accept\`** or **decline** like any other pending invite.

Invitees invited **before** signup see groups in **\`GET /v1/users/me/group-invites\`** after OTP, then accept or decline.

- **Success:** **\`201\`** — full roster (**\`GroupMemberRosterEntryDto[]\`**, incl. **\`status\`**) whenever a membership row exists; unchanged roster is normal for offline-phone upsert-only path
- **\`409 ALREADY_GROUP_MEMBER\`** — target already **\`active\`**
- **\`409 INVITE_ALREADY_PENDING\`** — duplicate **\`group_members\` \`pending\`** for registered target
- **\`400\`** — \`VALIDATION_ERROR\`, or **\`INVITE_SELF\`**
- **\`403\`** — **\`NOT_GROUP_MEMBER\`**, **\`GROUP_ADMIN_REQUIRED\`**, **\`ACCOUNT_INACTIVE\`**
- **\`404 USER_NOT_FOUND\`** — unknown \`username\` / \`userId\`; or \`identifier\` path only when malformed / empty (**not** thrown for unknown phone → \`group_invites\`)

### Auth
Bearer access token only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group to add the user to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({ type: AddGroupMemberDto })
  @ApiCreatedResponse({
    description:
      '`201 Created` — `{ success: true, data: GroupMemberRosterEntryDto[] }` (full roster).',
    type: GroupMemberListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '`VALIDATION_ERROR` or `INVITE_SELF`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      '`NOT_GROUP_MEMBER`, `GROUP_ADMIN_REQUIRED`, or `ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '`USER_NOT_FOUND` or `GROUP_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '`ALREADY_GROUP_MEMBER` or `INVITE_ALREADY_PENDING`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async addMember(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() body: AddGroupMemberDto,
  ): Promise<ApiSuccessResponse<GroupMemberRosterEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const members = await this.groups.addMember(userId, groupId, {
      ...(body.identifier !== undefined ? { identifier: body.identifier } : {}),
      ...(body.username !== undefined ? { username: body.username } : {}),
      ...(body.userId !== undefined ? { userId: body.userId } : {}),
    });
    return {
      success: true,
      data: members.map(groupMemberRowToRosterDto),
    };
  }

  @Patch(':groupId/members/:memberId/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promote member to admin or demote admin to member (owner only)',
    description: `
**\`role\` values** (allowed actions only):

| Body \`role\` | Action |
|---|---|
| **\`admin\`** | Promote a **\`member\`** to **admin**. |
| **\`member\`** | Demote an **\`admin\`** to **member**. |

**Only an active \`owner\`** may call (**\`403 GROUP_OWNER_REQUIRED\`** for admins/members or wrong role). **\`owner\`** row on the target → **\`403 GROUP_OWNER_PROTECTED\`**. Target must be **\`active\`** (else **\`403 NOT_GROUP_MEMBER\`**). Missing row → **\`404 GROUP_MEMBER_NOT_FOUND\`**.

**Success:** **\`200\`** — full \`GroupMemberRosterEntryDto[]\` (same sort as roster **GET**).

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group whose membership row is updated',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'memberId',
    format: 'uuid',
    description: '`User.id` whose `group_members.role` is updated',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiBody({ type: PatchGroupMemberRoleDto })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupMemberRosterEntryDto[] }` (updated roster).',
    type: GroupMemberListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '`VALIDATION_ERROR` (e.g. role not admin|member)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      '`GROUP_OWNER_REQUIRED`, `NOT_GROUP_MEMBER`, `GROUP_OWNER_PROTECTED`, or `ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      '`GROUP_MEMBER_NOT_FOUND`, `GROUP_NOT_FOUND`, or `USER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async patchMemberRole(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: PatchGroupMemberRoleDto,
  ): Promise<ApiSuccessResponse<GroupMemberRosterEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const members = await this.groups.updateMemberRole(
      userId,
      groupId,
      memberId,
      body.role,
    );
    return {
      success: true,
      data: members.map(groupMemberRowToRosterDto),
    };
  }

  @Delete(':groupId/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a group member (active admin or owner only)',
    description: `
**Rules**

1. **Only active \`owner\` or \`admin\`** may call (**\`403 GROUP_ADMIN_REQUIRED\`**, **\`NOT_GROUP_MEMBER\`**, **\`ACCOUNT_INACTIVE\`**). Ordinary **\`member\`** users cannot invoke this (**no self-serve leave** here).
2. **Cannot remove the group owner row** (**\`403 GROUP_OWNER_PROTECTED\`**).
3. **No membership for \`memberId\`** (**\`404 GROUP_MEMBER_NOT_FOUND\`** — wrong user, typo, concurrent delete).

**Additionally:** Only an **owner** may remove another **admin** outside of **admin removing themselves** (**\`403 ADMIN_REMOVE_REQUIRES_OWNER\`**).

**Success:** **\`200\`** — sorted \`GroupMemberRosterEntryDto[]\` (remaining roster).

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiParam({
    name: 'groupId',
    format: 'uuid',
    description: 'Group whose member is removed',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'memberId',
    format: 'uuid',
    description: '`User.id` whose `group_members` row is deleted',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: GroupMemberRosterEntryDto[] }` (updated roster).',
    type: GroupMemberListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      '`GROUP_OWNER_PROTECTED`, `ADMIN_REMOVE_REQUIRES_OWNER`, `NOT_GROUP_MEMBER`, `GROUP_ADMIN_REQUIRED`, or `ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      '`GROUP_MEMBER_NOT_FOUND`, `GROUP_NOT_FOUND`, or `USER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async removeMember(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<ApiSuccessResponse<GroupMemberRosterEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const members = await this.groups.removeMember(userId, groupId, memberId);
    return {
      success: true,
      data: members.map(groupMemberRowToRosterDto),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a group (authenticated)',
    description: `
Creates a group owned by the authenticated user.

### Auth
- **Bearer access token** only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`)

### Body
| Field | Required | Rules |
|---|---|---|
| \`name\` | ✅ | Trimmed string, **${String(GROUP_CONSTANTS.NAME_MIN_LENGTH)}–${String(GROUP_CONSTANTS.NAME_MAX_LENGTH)}** characters |
| \`type\` | ✅ | One of: **${GROUP_TYPE_SLUGS.join(', ')}** |
| \`avatar\` | ❌ | When set: valid \`http\`/\`https\` URL for the group image |

Examples: minimal body is \`{ "name": "Our home", "type": "home" }\`; include \`avatar\` when you have a hosted image URL.
`,
  })
  @ApiBody({
    type: CreateGroupDto,
    examples: {
      withAvatar: {
        summary: 'With avatar URL',
        value: {
          name: 'Goa Trip',
          type: 'trip',
          avatar: 'https://cdn.example.com/groups/goa.png',
        },
      },
      minimal: {
        summary: 'Name + type only',
        value: {
          name: 'Weekend flat',
          type: 'home',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      '`201 Created` — returns the new group; `data.avatar` is `null` when no `avatar` was sent.',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async create(
    @Req() req: Request,
    @Body() body: CreateGroupDto,
  ): Promise<ApiSuccessResponse<GroupDataDto>> {
    const authUser = authContextOrThrow(req);

    const group = await this.groups.createForUser(authUser.userId, {
      name: body.name,
      type: body.type,
      ...(body.avatar !== undefined ? { avatarUrl: body.avatar } : {}),
    });
    return {
      success: true,
      data: groupToDataDto(group),
    };
  }
}
