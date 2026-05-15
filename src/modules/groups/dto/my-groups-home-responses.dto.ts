import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupMemberRole } from '@prisma/client';

import { GROUP_CONSTANTS } from '../constants/group.constants';
import { GROUP_TYPE_SLUGS } from '../constants/group-type.constants';
import type { HomeGroupsTab } from './my-groups-home-query.dto';

/** Viewer balance bucket for tabs + UI (**owe** / **get_back** / **settled**). */
export type GroupHomeBalanceBucket = 'owe' | 'get_back' | 'settled';

export class MyGroupHomeSummaryDto {
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
    enumName: 'GroupTypeSlugHome',
  })
  type!: string;

  @ApiProperty({ type: String, nullable: true })
  avatar!: string | null;
}

/** One joined group row for **home** cards (balances + light aggregates). */
export class MyGroupHomeCardDto {
  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: MyGroupHomeSummaryDto })
  group!: MyGroupHomeSummaryDto;

  @ApiProperty({ enum: GroupMemberRole })
  role!: GroupMemberRole;

  @ApiProperty({ description: 'When you became an active member.' })
  joinedAt!: string;

  @ApiProperty()
  isCreator!: boolean;

  @ApiProperty({ description: 'Active **`group_members`** count.' })
  memberCount!: number;

  @ApiProperty({ description: 'Non-deleted expenses in this group.' })
  expenseCount!: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Title of the most recently **created** expense (by **`createdAt`**).',
  })
  recentExpenseTitle!: string | null;

  @ApiProperty({
    description:
      'Viewer net in **minor units** (same convention as **`GET …/balances`** **`summary.netMinor`**).',
    example: '-12500',
  })
  balanceNetMinor!: string;

  @ApiProperty({ example: 'INR' })
  dominantCurrency!: string;

  @ApiProperty({
    enum: ['owe', 'get_back', 'settled'],
    description:
      'Maps to tabs: **owe** / **get_back** / **settled** (when **`balanceNetMinor`** is **0**).',
  })
  balanceBucket!: GroupHomeBalanceBucket;

  @ApiProperty({
    description:
      'Count of simplified settlement edges (**`balances[]`**) where **you** are **`fromUserId`** or **`toUserId`**.',
  })
  pendingSettlementCount!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'ISO8601 — latest **`activity_logs`** row for this group.',
  })
  lastActivityAt!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: '`activity_logs.type` for **`lastActivityAt`**.',
  })
  lastActivityType!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      '`User.name` (or **`username`**) for **`activity_logs.actorId`**.',
  })
  lastActivityActorName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Short English phrase for subtitle (**FE may ignore** and localize from **`lastActivityType`**).',
  })
  lastActivityPreview!: string | null;

  @ApiProperty({
    description:
      'ISO8601 — when group balance snapshot was computed (**Redis TTL-backed cache**).',
  })
  balanceUpdatedAt!: string;
}

export class MyGroupsHomePageDto {
  @ApiProperty({
    enum: ['all', 'owe', 'get_back', 'settled'],
    description: 'Echo of requested **`tab`**.',
  })
  tab!: HomeGroupsTab;

  @ApiProperty({ type: [MyGroupHomeCardDto] })
  items!: MyGroupHomeCardDto[];
}

export class MyGroupsHomeListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MyGroupsHomePageDto })
  data!: MyGroupsHomePageDto;
}
