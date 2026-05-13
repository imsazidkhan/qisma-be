import { ApiProperty } from '@nestjs/swagger';
import { GroupMemberRole } from '@prisma/client';

import { GROUP_CONSTANTS } from '../constants/group.constants';
import { GROUP_TYPE_SLUGS } from '../constants/group-type.constants';

/** Slim group card for **joined** groups list (no `createdAt` / `updatedAt`). */
export class MyGroupSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'Goa Trip',
    minLength: GROUP_CONSTANTS.NAME_MIN_LENGTH,
    maxLength: GROUP_CONSTANTS.NAME_MAX_LENGTH,
  })
  name!: string;

  @ApiProperty({
    description: 'Group category slug.',
    example: 'trip',
    enum: GROUP_TYPE_SLUGS,
    enumName: 'GroupTypeSlugMyGroups',
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
}

/** One **active** membership — **home / “my groups”** list row. */
export class MyGroupRowDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Same as `group.id` (stable join key for navigation).',
  })
  groupId!: string;

  @ApiProperty({ type: MyGroupSummaryDto })
  group!: MyGroupSummaryDto;

  @ApiProperty({
    enum: GroupMemberRole,
    description: 'Your role in this group.',
  })
  role!: GroupMemberRole;

  @ApiProperty({
    description: 'When you became an active member (`group_members.joinedAt`).',
  })
  joinedAt!: Date;

  @ApiProperty({
    description:
      '`true` when **you** created the group (`Group.createdByUserId`).',
  })
  isCreator!: boolean;
}

export class MyActiveGroupListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MyGroupRowDto, isArray: true })
  data!: MyGroupRowDto[];
}
