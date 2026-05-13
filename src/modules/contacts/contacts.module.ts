import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { GroupsModule } from '../groups/groups.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactSyncRateLimitService } from './services/contact-sync-rate-limit.service';

@Module({
  imports: [RedisModule, GroupsModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactSyncRateLimitService],
})
export class ContactsModule {}
