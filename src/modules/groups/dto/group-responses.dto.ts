import { ApiProperty } from '@nestjs/swagger';

import { GROUP_CONSTANTS } from '../constants/group.constants';
import { GROUP_TYPE_SLUGS } from '../constants/group-type.constants';

const GROUP_MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
const GROUP_MEMBER_STATUSES = ['active', 'pending'] as const;

/** Payload for group-detail / list-item responses */
export class GroupDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'Goa Trip',
    minLength: GROUP_CONSTANTS.NAME_MIN_LENGTH,
    maxLength: GROUP_CONSTANTS.NAME_MAX_LENGTH,
  })
  name!: string;

  @ApiProperty({
    description: 'Group category.',
    example: 'trip',
    enum: GROUP_TYPE_SLUGS,
  })
  type!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Public image URL for the group, or `null` if none was set at creation.',
    example: 'https://cdn.app.com/group.png',
  })
  avatar!: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'User id of the creator, if set.',
  })
  createdByUserId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class GroupDetailResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupDataDto })
  data!: GroupDataDto;
}

/**
 * **`GET /v1/groups/:groupId/member-profile`** — **Option B:** same **`GroupDataDto`** body as creator **`GET /v1/groups/:groupId`**, but authorized for any **active** member.
 */
export class GroupMemberProfileResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: GroupDataDto,
    description: 'Group metadata — identical DTO to creator-only group detail.',
  })
  data!: GroupDataDto;
}

export class GroupListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupDataDto, isArray: true })
  data!: GroupDataDto[];
}

/** `GET /v1/groups/:groupId/invite-preview` — **pending invitee only** (no roster, no timestamps). */
export class GroupInvitePreviewDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'Goa Trip',
    minLength: GROUP_CONSTANTS.NAME_MIN_LENGTH,
    maxLength: GROUP_CONSTANTS.NAME_MAX_LENGTH,
  })
  name!: string;

  @ApiProperty({
    description: 'Group category.',
    example: 'trip',
    enum: GROUP_TYPE_SLUGS,
    enumName: 'GroupTypeSlugPreview',
  })
  type!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Public image URL for the group, or `null` if none was set at creation.',
    example: 'https://cdn.app.com/group.png',
  })
  avatar!: string | null;

  @ApiProperty({
    minimum: 0,
    description:
      'Count of **active** memberships (joined members only — excludes other **pending** rows).',
  })
  memberCount!: number;
}

export class GroupInvitePreviewResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupInvitePreviewDataDto })
  data!: GroupInvitePreviewDataDto;
}

export class GroupDeleteDataDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Id of the deleted group (same as the path parameter).',
  })
  deletedGroupId!: string;
}

export class GroupDeleteResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupDeleteDataDto })
  data!: GroupDeleteDataDto;
}

/**
 * One roster row for **`GET`** / **`POST`** `/v1/groups/:groupId/members` (`data[]`).
 */
export class GroupMemberRosterEntryDto {
  /** User id (member identity). */
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '`User.avatarUrl` — `null` if unset.',
    example: 'https://cdn.app.com/profile.png',
  })
  avatar!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '`User.name` (`null` until onboarding updates profile).',
  })
  name!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '`User.username` (`null` if none).',
    example: 'jane_doe',
  })
  username!: string | null;

  @ApiProperty({ enum: GROUP_MEMBER_ROLES })
  role!: (typeof GROUP_MEMBER_ROLES)[number];

  @ApiProperty({
    enum: GROUP_MEMBER_STATUSES,
    description: '`pending` rows are invites awaiting accept/decline.',
  })
  status!: (typeof GROUP_MEMBER_STATUSES)[number];

  @ApiProperty({
    type: Date,
    nullable: true,
    description: '`group_members.joinedAt` (`null` e.g. pending).',
  })
  joinedAt!: Date | null;
}

/** Roster payloads: `GET` / `POST` `/v1/groups/:groupId/members`, **`POST` accept-invite**. */
export class GroupMemberListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupMemberRosterEntryDto, isArray: true })
  data!: GroupMemberRosterEntryDto[];
}

/** \`POST /v1/groups/:groupId/invites/decline\` — minimal payload for UI cache eviction. */
export class GroupInviteDeclinedDataDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Group whose pending invite was removed.',
  })
  groupId!: string;
}

export class GroupInviteDeclinedResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupInviteDeclinedDataDto })
  data!: GroupInviteDeclinedDataDto;
}
