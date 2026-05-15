import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { GroupsModule } from '../groups/groups.module';
import { SplitsModule } from '../splits/splits.module';
import { UploadModule } from '../upload/upload.module';

import { ClassifierService } from './classification/classifier.service';
import { TaxonomyCacheService } from './classification/taxonomy-cache.service';
import { UserLearningService } from './classification/user-learning.service';
import { ExpenseCommentsService } from './expense-comments.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { GroupBalanceCacheService } from './group-balance-cache.service';
import { RecurringDetectionService } from './recurring-detection.service';

/**
 * **`GroupsModule`** → **`GroupMembershipRulesService`** (membership checks).
 * **`ExpenseCommentsService`** is a provider so **`ExpensesController`** and **`ExpensesService`** can inject it.
 */
@Module({
  imports: [GroupsModule, SplitsModule, UploadModule, AnalyticsModule],
  controllers: [ExpensesController],
  providers: [
    ExpenseCommentsService,
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
