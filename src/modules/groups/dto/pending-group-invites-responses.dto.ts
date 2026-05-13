import { ApiProperty } from '@nestjs/swagger';
import { GroupMemberRole } from '@prisma/client';

import { GROUP_TYPE_SLUGS } from '../constants/group-type.constants';

/** Person who sent the invite (`group_members.addedBy`), when set. */
export class GroupInviteInvitedByDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Public profile image URL',
  })
  avatar!: string | null;
}

/** Pending group_members row for the authenticated invitee. */
export class PendingGroupInviteEntryDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Group id (Group.id); use in POST /v1/groups/{groupId}/invites/accept or decline.',
  })
  groupId!: string;

  @ApiProperty({ description: '`Group.name`' })
  groupName!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Group image URL or `null`',
  })
  groupAvatar!: string | null;

  @ApiProperty({
    enum: GROUP_TYPE_SLUGS,
    enumName: 'GroupTypeSlug',
    description: 'Product category slug.',
  })
  groupType!: string;

  @ApiProperty({
    enum: GroupMemberRole,
    description: 'Membership role offered (normally member).',
  })
  role!: GroupMemberRole;

  @ApiProperty({
    description:
      '`group_members.createdAt` — when this pending invite was created.',
  })
  invitedAt!: Date;

  @ApiProperty({
    type: GroupInviteInvitedByDto,
    nullable: true,
    description: 'User who invited you (membership addedBy); null if unknown.',
  })
  invitedBy!: GroupInviteInvitedByDto | null;
}

export class PendingGroupInviteListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PendingGroupInviteEntryDto, isArray: true })
  data!: PendingGroupInviteEntryDto[];
}
