import { Module } from '@nestjs/common';

import { GroupActivityRepository } from './repositories/group-activity.repository';
import { GroupInviteRepository } from './repositories/group-invite.repository';
import { GroupMembershipRulesService } from './permissions/group-membership-rules.service';
import { GroupMemberRepository } from './repositories/group-member.repository';
import { GroupRepository } from './repositories/group.repository';
import { GroupsService } from './groups.service';

/** Group domain providers; `GroupsController` is registered via {@link AuthModule}. */
@Module({
  providers: [
    GroupRepository,
    GroupInviteRepository,
    GroupMemberRepository,
    GroupActivityRepository,
    GroupMembershipRulesService,
    GroupsService,
  ],
  exports: [
    GroupsService,
    GroupMembershipRulesService,
    GroupMemberRepository,
    GroupActivityRepository,
  ],
})
export class GroupsModule {}
