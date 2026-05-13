import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { DebtSimplificationService } from './debt-simplification.service';
import { ExpenseSplitService } from './expense-split.service';
import type { ExpenseBalanceEntry, GroupBalanceEdge, SimplifiedTransfer } from './types/split.types';

/** Aggregate expense entries → per-user net, then **minimal** settlement transfers. */
@Injectable()
export class BalanceEngine {
  constructor(
    private readonly debtSimplification: DebtSimplificationService,
  ) {}

  /**
   * @param entries Ledger rows for one group (each expense: who paid + each participant’s owed share).
   * @param scale Decimal places for money (e.g. **2** for INR).
   */
  computeGroupBalances(
    groupId: string,
    entries: readonly ExpenseBalanceEntry[],
    scale = 2,
  ): {
    netByUserId: Record<string, string>;
    transfers: SimplifiedTransfer[];
    edges: GroupBalanceEdge[];
  } {
    const net = new Map<string, Decimal>();
    for (const e of entries) {
      const delta = ExpenseSplitService.netFromExpense(e);
      for (const [uid, v] of delta) {
        net.set(uid, (net.get(uid) ?? new Decimal(0)).add(v));
      }
    }

    const netByUserId: Record<string, string> = {};
    for (const [uid, v] of net) {
      const rounded = v.toDP(scale, Decimal.ROUND_HALF_UP);
      if (!rounded.isZero()) {
        netByUserId[uid] = rounded.toString();
      }
    }

    const transfers = this.debtSimplification.simplify(netByUserId, scale);
    const edges: GroupBalanceEdge[] = transfers.map((t) => ({
      groupId,
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      amount: t.amount,
    }));

    return { netByUserId, transfers, edges };
  }

  /**
   * Convenience: nets from numeric **owed** map + single payer (same as one {@link ExpenseBalanceEntry}).
   */
  static singleExpenseEntry(
    paidByUserId: string,
    totalAmount: string,
    owedByUserId: Readonly<Record<string, string>>,
  ): ExpenseBalanceEntry {
    return { paidByUserId, totalAmount, owedByUserId };
  }
}
