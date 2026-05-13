import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { GroupsModule } from '../groups/groups.module';
import { SplitsModule } from '../splits/splits.module';
import { UploadModule } from '../upload/upload.module';

import { ClassifierService } from './classification/classifier.service';
import { TaxonomyCacheService } from './classification/taxonomy-cache.service';
import { UserLearningService } from './classification/user-learning.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { GroupBalanceCacheService } from './group-balance-cache.service';
import { RecurringDetectionService } from './recurring-detection.service';

@Module({
  imports: [GroupsModule, SplitsModule, UploadModule, AnalyticsModule],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    TaxonomyCacheService,
    ClassifierService,
    UserLearningService,
    GroupBalanceCacheService,
    RecurringDetectionService,
  ],
  exports: [ExpensesService],
})
export class ExpensesModule {}
