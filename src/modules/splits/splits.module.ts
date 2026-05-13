import { Module } from '@nestjs/common';

import { BalanceEngine } from './balance.engine';
import { DebtSimplificationService } from './debt-simplification.service';
import { ExpenseSplitService } from './expense-split.service';

@Module({
  providers: [ExpenseSplitService, DebtSimplificationService, BalanceEngine],
  exports: [ExpenseSplitService, DebtSimplificationService, BalanceEngine],
})
export class SplitsModule {}
