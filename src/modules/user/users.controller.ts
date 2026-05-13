import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnauthorizedException } from '../../common/exceptions/api.exception';
import {
  GroupInviteInvitedByDto,
  PendingGroupInviteEntryDto,
  PendingGroupInviteListResponseDto,
} from '../groups/dto/pending-group-invites-responses.dto';
import {
  MyActiveGroupListResponseDto,
  MyGroupRowDto,
  MyGroupSummaryDto,
} from '../groups/dto/my-active-groups-responses.dto';
import { GroupsService } from '../groups/groups.service';
import { USER_CONSTANTS } from './constants/user.constants';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import {
  UserSearchHitDto,
  UserSearchListResponseDto,
} from './dto/user-search-responses.dto';
import { UserSearchHit, UserService } from './user.service';

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

function toSearchHitDto(hit: UserSearchHit): UserSearchHitDto {
  return {
    id: hit.id,
    name: hit.name,
    username: hit.username,
    avatar: hit.avatar,
  };
}

function toPendingInviteDto(
  invite: Awaited<
    ReturnType<GroupsService['listPendingInvitesForUser']>
  >[number],
): PendingGroupInviteEntryDto {
  return {
    groupId: invite.groupId,
    groupName: invite.groupName,
    groupAvatar: invite.groupAvatar,
    groupType: invite.groupType,
    role: invite.role,
    invitedAt: invite.invitedAt,
    invitedBy: invite.invitedBy
      ? {
          userId: invite.invitedBy.userId,
          name: invite.invitedBy.name,
          username: invite.invitedBy.username,
          avatar: invite.invitedBy.avatar,
        }
      : null,
  };
}

function toMyGroupRowDto(
  row: Awaited<ReturnType<GroupsService['listMyActiveGroups']>>[number],
): MyGroupRowDto {
  return {
    groupId: row.groupId,
    group: {
      id: row.group.id,
      name: row.group.name,
      type: row.group.type,
      avatar: row.group.avatar,
    } satisfies MyGroupSummaryDto,
    role: row.role,
    joinedAt: row.joinedAt,
    isCreator: row.isCreator,
  };
}

@ApiTags('Users')
@ApiExtraModels(
  ApiErrorDto,
  SearchUsersQueryDto,
  UserSearchHitDto,
  UserSearchListResponseDto,
  PendingGroupInviteEntryDto,
  GroupInviteInvitedByDto,
  PendingGroupInviteListResponseDto,
  MyGroupRowDto,
  MyGroupSummaryDto,
  MyActiveGroupListResponseDto,
)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UserService,
    private readonly groups: GroupsService,
  ) {}

  /**
   * **`GET /v1/users/me/group-invites`** — pending **`group_members`** inbox (registered-target
   * + materialized **`group_invites`** after OTP); maps **`GroupsService.listPendingInvitesForUser`**.
   */
  @Get('me/group-invites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'List my pending group invites (authenticated) — `group_members.pending` inbox only',
    description: `
Returns every **pending** **\`group_members\`** row for **you** (**newest \`createdAt\` first**), with **minimal group + inviter** fields for inbox UIs (**registered-target invites OR rows created from \`group_invites\` at first OTP verify**).

- Callers use **\`POST /v1/groups/{groupId}/invites/accept\`** or **\`POST /v1/groups/{groupId}/invites/decline\`** with **\`groupId\`** from each item.

Bearer access token (**\`type: access\`**).
`,
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: PendingGroupInviteEntryDto[] }` (**empty array** when none pending).',
    type: PendingGroupInviteListResponseDto,
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
    description: '`USER_NOT_FOUND` — JWT subject user row missing',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async listMyGroupInvites(
    @Req() req: Request,
  ): Promise<ApiSuccessResponse<PendingGroupInviteEntryDto[]>> {
    const { userId } = authContextOrThrow(req);
    const items = await this.groups.listPendingInvitesForUser(userId);
    return {
      success: true,
      data: items.map(toPendingInviteDto),
    };
  }

  @Get('me/groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'List my joined groups (authenticated) — active memberships only, for home screen',
    description: `
Returns one row per **\`group_members\`** row where **\`status\` is \`active\`** (you are a **joined** member).

- **Ordering:** **newest \`joinedAt\` first** (ties follow Prisma / DB order).
- **\`isCreator\`:** **\`true\`** when **\`Group.createdByUserId\`** is **you** — use to badge **“You created this”** without calling **\`GET /v1/groups\`**.
- **Pending** invites are **not** included — use **\`GET /v1/users/me/group-invites\`**.
- **Different from** **\`GET /v1/groups\`**, which lists only groups **you created** (creator filter).

### Auth
Bearer access token (**\`type: access\`**).
`,
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: MyGroupRowDto[] }` (**empty array** when you have no active memberships).',
    type: MyActiveGroupListResponseDto,
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
    description: '`USER_NOT_FOUND` — JWT subject user row missing',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async listMyJoinedGroups(
    @Req() req: Request,
  ): Promise<ApiSuccessResponse<MyGroupRowDto[]>> {
    const { userId } = authContextOrThrow(req);
    const rows = await this.groups.listMyActiveGroups(userId);
    return {
      success: true,
      data: rows.map(toMyGroupRowDto),
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Search users by phone, username, or name (authenticated)',
    description: `
Directory lookup (e.g. add-member UIs). Pass \`q\` (**min ${String(USER_CONSTANTS.SEARCH_QUERY_MIN_LENGTH)}**, **max ${String(USER_CONSTANTS.SEARCH_QUERY_MAX_LENGTH)}** chars).

| Match | Behaviour |
|-------|-----------|
| **Phone** | If \`q\` is a full **E.164-style** number, **exact** match on \`User.identifier\`. |
| **Username** | Leading run of \`[a-z0-9_]\` (after optional \`@\`, lowercased) — if length ≥ **${String(USER_CONSTANTS.SEARCH_USERNAME_PREFIX_MIN)}**, **prefix** match on \`User.username\`. |
| **Name** | **Always:** case-insensitive **contains** on \`User.name\` (users without a name still match via phone/username branch). |

Results are **OR**-combined, **≤${String(USER_CONSTANTS.SEARCH_MAX_RESULTS)}** rows, ordered by \`name\` then \`id\`.

- **Privacy:** Responses **never** include raw phone / \`identifier\`.
- **Self:** Caller is **never** returned.
- **Inactive** users are omitted.

### Auth
Bearer access token (\`type: access\`).
`,
  })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: UserSearchHitDto[] }` (`id`, `name`, `username`, `avatar`; empty if no matches).',
    type: UserSearchListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      '`VALIDATION_ERROR` — invalid or empty `q`, or length out of range',
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
    description: '`USER_NOT_FOUND` — JWT subject user row missing',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async search(
    @Req() req: Request,
    @Query() query: SearchUsersQueryDto,
  ): Promise<ApiSuccessResponse<UserSearchHitDto[]>> {
    const { userId } = authContextOrThrow(req);
    const hits = await this.users.searchUsers(userId, query.q);
    return {
      success: true,
      data: hits.map(toSearchHitDto),
    };
  }
}
