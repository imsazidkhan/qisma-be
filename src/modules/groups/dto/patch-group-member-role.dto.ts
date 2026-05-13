import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { GROUP_MEMBER_ROLES_PATCHABLE } from '../constants/group-member-role.constants';

/** Body for \`PATCH /v1/groups/:groupId/members/:memberId/role\`. \`owner\` is never set here — use ownership transfer later. */
export class PatchGroupMemberRoleDto {
  @ApiProperty({
    enum: GROUP_MEMBER_ROLES_PATCHABLE,
    description:
      '`admin` to promote member → admin; `member` to demote admin → member. **Owner only**.',
    example: 'admin',
  })
  @IsIn(GROUP_MEMBER_ROLES_PATCHABLE)
  role!: (typeof GROUP_MEMBER_ROLES_PATCHABLE)[number];
}
