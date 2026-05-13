import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { EXPENSE_SPLIT_TYPE } from './constants/expense-split.constants';
import {
  distributeEqual,
  distributeMoneyByWeights,
  toMinorUnits,
} from './rounding.engine';
import type {
  ExpenseBalanceEntry,
  ExpenseSplitComputationInput,
  ParticipantOwedShare,
  SplitComputationResult,
} from './types/split.types';

const D = (x: string): Decimal => new Decimal(x);

const EPS = new Decimal('0.0001');

@Injectable()
export class ExpenseSplitService {
  compute(input: ExpenseSplitComputationInput): SplitComputationResult {
    const scale = input.scale ?? 2;
    const currency = input.currency;
    const total = input.totalAmount;

    switch (input.splitType) {
      case EXPENSE_SPLIT_TYPE.EQUAL:
        return this.equal(input, total, currency, scale);
      case EXPENSE_SPLIT_TYPE.EXACT:
        return this.exact(input, total, currency, scale);
      case EXPENSE_SPLIT_TYPE.PERCENTAGE:
        return this.percentage(input, total, currency, scale);
      case EXPENSE_SPLIT_TYPE.SHARES:
        return this.shares(input, total, currency, scale);
      case EXPENSE_SPLIT_TYPE.ADJUSTMENT:
        return this.adjustment(input, total, currency, scale);
      case EXPENSE_SPLIT_TYPE.ITEMIZED:
        return this.itemized(input, total, currency, scale);
      default:
        throw new Error(
          `Unsupported split type: ${(input as { splitType: string }).splitType}`,
        );
    }
  }

  /** B · exact → net balance per user (for {@link BalanceEngine}). */
  static netFromExpense(entry: ExpenseBalanceEntry): Map<string, Decimal> {
    const net = new Map<string, Decimal>();
    const total = D(entry.totalAmount);
    const payer = entry.paidByUserId;

    for (const [userId, owedRaw] of Object.entries(entry.owedByUserId)) {
      const owed = D(owedRaw);
      net.set(userId, (net.get(userId) ?? new Decimal(0)).sub(owed));
    }

    const prev = net.get(payer) ?? new Decimal(0);
    net.set(payer, prev.add(total));

    return net;
  }

  private equal(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'equal' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const ids = [...new Set(input.participantUserIds)];
    if (ids.length === 0) {
      throw new Error('equal split requires at least one participant');
    }
    const parts = distributeEqual(total, ids.length, scale);
    const participantShares: ParticipantOwedShare[] = ids.map((userId, i) => ({
      userId,
      owedAmount: parts[i] ?? '0',
    }));
    return this.wrap(
      EXPENSE_SPLIT_TYPE.EQUAL,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private exact(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'exact' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const entries = Object.entries(input.amountsByUserId);
    if (entries.length === 0) {
      throw new Error('exact split requires at least one amount');
    }
    let sum = new Decimal(0);
    for (const [, amt] of entries) {
      sum = sum.add(D(amt));
    }
    if (!sum.sub(D(total)).abs().lte(EPS)) {
      throw new Error(
        `exact split amounts must sum to total (got ${sum.toString()}, expected ${total})`,
      );
    }
    const participantShares: ParticipantOwedShare[] = entries.map(
      ([userId, owedAmount]) => ({
        userId,
        owedAmount: D(owedAmount).toDP(scale, Decimal.ROUND_HALF_UP).toString(),
      }),
    );
    return this.wrap(
      EXPENSE_SPLIT_TYPE.EXACT,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private percentage(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'percentage' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const entries = Object.entries(input.percentageByUserId);
    if (entries.length === 0) {
      throw new Error('percentage split requires at least one participant');
    }
    let sumPct = new Decimal(0);
    for (const [, p] of entries) {
      sumPct = sumPct.add(D(p));
    }
    if (!sumPct.sub(100).abs().lte(new Decimal('0.01'))) {
      throw new Error(
        `percentages must sum to 100 (got ${sumPct.toString()})`,
      );
    }
    const ids = entries.map(([uid]) => uid);
    const weights = entries.map(([, p]) => p);
    const parts = distributeMoneyByWeights(total, weights, scale);
    const participantShares: ParticipantOwedShare[] = ids.map((userId, i) => ({
      userId,
      owedAmount: parts[i] ?? '0',
      percentage: D(entries[i]![1]).toString(),
    }));
    return this.wrap(
      EXPENSE_SPLIT_TYPE.PERCENTAGE,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private shares(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'shares' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const entries = Object.entries(input.sharesByUserId);
    if (entries.length === 0) {
      throw new Error('shares split requires at least one participant');
    }
    let sumS = new Decimal(0);
    for (const [, s] of entries) {
      const v = D(s);
      if (v.lte(0)) {
        throw new Error('each share must be positive');
      }
      sumS = sumS.add(v);
    }
    if (sumS.lte(0)) {
      throw new Error('sum of shares must be positive');
    }
    const ids = entries.map(([u]) => u);
    const weights = entries.map(([, s]) => s);
    const parts = distributeMoneyByWeights(total, weights, scale);
    const participantShares: ParticipantOwedShare[] = ids.map((userId, i) => ({
      userId,
      owedAmount: parts[i] ?? '0',
      shares: D(entries[i]![1]).toString(),
    }));
    return this.wrap(
      EXPENSE_SPLIT_TYPE.SHARES,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private adjustment(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'adjustment' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const fixedEntries = Object.entries(input.fixedAmountsByUserId);
    const fixedIds = new Set(fixedEntries.map(([u]) => u));
    for (const u of input.remainderUserIds) {
      if (fixedIds.has(u)) {
        throw new Error('remainderUserIds must be disjoint from fixed amounts');
      }
    }
    if (input.remainderUserIds.length === 0) {
      throw new Error('adjustment split requires at least one remainder user');
    }

    let fixedSum = new Decimal(0);
    for (const [, a] of fixedEntries) {
      fixedSum = fixedSum.add(D(a));
    }
    const totalD = D(total);
    if (fixedSum.gt(totalD.add(EPS))) {
      throw new Error('fixed amounts cannot exceed total');
    }
    const remainderAmt = totalD.sub(fixedSum);
    if (remainderAmt.lt(0)) {
      throw new Error('remainder would be negative');
    }

    const remIds = [...new Set(input.remainderUserIds)];
    const remParts = distributeEqual(
      remainderAmt.toString(),
      remIds.length,
      scale,
    );

    const owedMap = new Map<string, Decimal>();
    for (const [uid, amt] of fixedEntries) {
      owedMap.set(uid, D(amt));
    }
    remIds.forEach((uid, i) => {
      const add = D(remParts[i] ?? '0');
      owedMap.set(uid, (owedMap.get(uid) ?? new Decimal(0)).add(add));
    });

    const participantShares: ParticipantOwedShare[] = [...owedMap.entries()].map(
      ([userId, v]) => ({
        userId,
        owedAmount: v.toDP(scale, Decimal.ROUND_HALF_UP).toString(),
      }),
    );

    return this.wrap(
      EXPENSE_SPLIT_TYPE.ADJUSTMENT,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private itemized(
    input: Extract<ExpenseSplitComputationInput, { splitType: 'itemized' }>,
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    const all = new Set(input.allParticipantUserIds);
    if (all.size === 0) {
      throw new Error('itemized split requires allParticipantUserIds');
    }

    let linesSum = new Decimal(0);
    const acc = new Map<string, Decimal>();

    for (const line of input.lines) {
      const lineTotal = D(line.amount);
      linesSum = linesSum.add(lineTotal);

      let targets: string[];
      if (line.splitAmongEveryone) {
        targets = [...all];
      } else {
        const p = line.participantUserIds ?? [];
        targets = [...new Set(p)];
        for (const u of targets) {
          if (!all.has(u)) {
            throw new Error(
              `itemized line "${line.label}" references user outside group: ${u}`,
            );
          }
        }
      }
      if (targets.length === 0) {
        throw new Error(
          `itemized line "${line.label}" has no participants`,
        );
      }

      const split = distributeEqual(lineTotal.toString(), targets.length, scale);
      for (let i = 0; i < targets.length; i++) {
        const uid = targets[i]!;
        const part = D(split[i] ?? '0');
        acc.set(uid, (acc.get(uid) ?? new Decimal(0)).add(part));
      }
    }

    if (!linesSum.sub(D(total)).abs().lte(EPS)) {
      throw new Error(
        `itemized lines sum (${linesSum.toString()}) must equal expense total (${total})`,
      );
    }

    const participantShares: ParticipantOwedShare[] = [...acc.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([userId, v]) => ({
        userId,
        owedAmount: v.toDP(scale, Decimal.ROUND_HALF_UP).toString(),
      }));

    return this.wrap(
      EXPENSE_SPLIT_TYPE.ITEMIZED,
      participantShares,
      total,
      currency,
      scale,
    );
  }

  private wrap(
    splitType: SplitComputationResult['splitType'],
    participantShares: ParticipantOwedShare[],
    total: string,
    currency: string,
    scale: number,
  ): SplitComputationResult {
    let sum = new Decimal(0);
    for (const p of participantShares) {
      sum = sum.add(D(p.owedAmount));
    }
    if (!sum.sub(D(total)).abs().lte(EPS)) {
      throw new Error(
        `split internal error: sum ${sum.toString()} !== total ${total}`,
      );
    }
    toMinorUnits(total, scale); // validates format
    return {
      splitType,
      participantShares,
      sumOwed: sum.toDP(scale, Decimal.ROUND_HALF_UP).toString(),
      currency,
      scale,
    };
  }
}
