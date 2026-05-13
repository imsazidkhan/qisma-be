import { ApiProperty } from '@nestjs/swagger';
import { GroupActivityEventType } from '@prisma/client';

/** Minimal user snippet for feed rows (no raw phone). */
export class GroupActivityUserSnippetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Public avatar URL' })
  avatar!: string | null;
}

/** One **`group_activity_events`** row for **`GET /v1/groups/:groupId/activity`**. */
export class GroupActivityEventEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: GroupActivityEventType,
    description: 'Mirrors Prisma **`GroupActivityEventType`**.',
  })
  type!: GroupActivityEventType;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({
    type: GroupActivityUserSnippetDto,
    nullable: true,
    description:
      'Primary actor (inviter on **`invite_sent`**, acceptor on **`invite_accepted`**, joining user on **`member_joined`**).',
  })
  actor!: GroupActivityUserSnippetDto | null;

  @ApiProperty({
    type: GroupActivityUserSnippetDto,
    nullable: true,
    description:
      'Counterparty when distinct from **actor** (**invitee** on **`invite_sent`**, **inviter** on **`invite_accepted`**).',
  })
  subject!: GroupActivityUserSnippetDto | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Opaque JSON (e.g. **`{ offlinePhoneInvite: true }`**). Never includes raw phone digits.',
    additionalProperties: true,
  })
  payload!: Record<string, unknown> | null;
}

export class GroupActivityListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GroupActivityEventEntryDto, isArray: true })
  data!: GroupActivityEventEntryDto[];
}
