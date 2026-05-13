import { Module } from '@nestjs/common';

import { GroupsModule } from '../groups/groups.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GroupAnalyticsCacheService } from './group-analytics-cache.service';

@Module({
  imports: [GroupsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, GroupAnalyticsCacheService],
  exports: [GroupAnalyticsCacheService],
})
export class AnalyticsModule {}
