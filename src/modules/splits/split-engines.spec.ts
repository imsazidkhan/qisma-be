import { Test, TestingModule } from '@nestjs/testing';

import { BalanceEngine } from './balance.engine';
import { DebtSimplificationService } from './debt-simplification.service';
import { ExpenseSplitService } from './expense-split.service';
import { EXPENSE_SPLIT_TYPE } from './constants/expense-split.constants';
import { distributeEqual } from './rounding.engine';

describe('Rounding (₹33.33 × 3)', () => {
  it('sums to 100.00', () => {
    const parts = distributeEqual('100', 3, 2);
    expect(parts.reduce((a, b) => parseFloat(a) + parseFloat(b), 0)).toBeCloseTo(
      100,
      10,
    );
    expect(parts.sort()).toEqual(['33.33', '33.33', '33.34']);
  });
});

describe('ExpenseSplitService', () => {
  let svc: ExpenseSplitService;

  beforeEach(() => {
    svc = new ExpenseSplitService();
  });

  it('equal: 1200 / 4', () => {
    const r = svc.compute({
      splitType: EXPENSE_SPLIT_TYPE.EQUAL,
      totalAmount: '1200',
      currency: 'INR',
      participantUserIds: ['a', 'b', 'c', 'd'],
    });
    expect(r.participantShares.every((p) => p.owedAmount === '300')).toBe(true);
    expect(r.sumOwed).toBe('1200');
  });

  it('percentage totals 100%', () => {
    const r = svc.compute({
      splitType: EXPENSE_SPLIT_TYPE.PERCENTAGE,
      totalAmount: '200',
      currency: 'INR',
      percentageByUserId: { u1: '50', u2: '25', u3: '25' },
    });
    expect(parseFloat(r.sumOwed)).toBeCloseTo(200, 8);
  });

  it('shares: formula', () => {
    const r = svc.compute({
      splitType: EXPENSE_SPLIT_TYPE.SHARES,
      totalAmount: '100',
      currency: 'INR',
      sharesByUserId: { u1: '1', u2: '3' },
    });
    const by: Record<string, string> = {};
    for (const p of r.participantShares) {
      by[p.userId] = p.owedAmount;
    }
    expect(by['u1']).toBe('25');
    expect(by['u2']).toBe('75');
  });

  it('adjustment: remainder split', () => {
    const r = svc.compute({
      splitType: EXPENSE_SPLIT_TYPE.ADJUSTMENT,
      totalAmount: '1000',
      currency: 'INR',
      fixedAmountsByUserId: { a: '400' },
      remainderUserIds: ['b', 'c'],
    });
    const m = Object.fromEntries(r.participantShares.map((p) => [p.userId, p.owedAmount]));
    expect(m['a']).toBe('400');
    expect(m['b']).toBe('300');
    expect(m['c']).toBe('300');
  });

  it('itemized: pizza vs everyone', () => {
    const r = svc.compute({
      splitType: EXPENSE_SPLIT_TYPE.ITEMIZED,
      totalAmount: '90',
      currency: 'INR',
      allParticipantUserIds: ['rahul', 'you', 'aryan'],
      lines: [
        {
          label: 'Pizza',
          amount: '60',
          participantUserIds: ['rahul', 'you'],
        },
        {
          label: 'Fries',
          amount: '30',
          splitAmongEveryone: true,
        },
      ],
    });
    const m = Object.fromEntries(r.participantShares.map((p) => [p.userId, p.owedAmount]));
    expect(m['rahul']).toBe('40'); // 30 pizza + 10 fries
    expect(m['you']).toBe('40');
    expect(m['aryan']).toBe('10');
  });
});

describe('DebtSimplificationService', () => {
  it('linear chain A→B→C→D collapses', () => {
    const debt = new DebtSimplificationService();
    const t = debt.simplify(
      {
        A: '30',
        B: '0',
        C: '0',
        D: '-30',
      },
      2,
    );
    expect(t.length).toBeLessThanOrEqual(3);
    const sum = t.reduce((s, x) => s + parseFloat(x.amount), 0);
    expect(sum).toBeCloseTo(30, 8);
    expect(t.some((x) => x.fromUserId === 'D' && x.toUserId === 'A')).toBe(true);
  });
});

describe('BalanceEngine', () => {
  it('group balance edges', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [BalanceEngine, DebtSimplificationService],
    }).compile();
    const balance = moduleRef.get(BalanceEngine);

    const { edges, netByUserId } = balance.computeGroupBalances(
      'grp-1',
      [
        BalanceEngine.singleExpenseEntry('b', '120', {
          a: '30',
          b: '30',
          c: '30',
          d: '30',
        }),
      ],
      2,
    );

    expect(parseFloat(netByUserId['b'] ?? '0')).toBeCloseTo(90, 8);
    expect(edges.every((e) => e.groupId === 'grp-1')).toBe(true);
  });
});
