import { ExpenseInvalidCursorException } from '../../../common/exceptions/api.exception';
import { EXPENSE_FEED_SORT } from '../constants/expense.constants';
import type { ExpenseFeedSort } from '../constants/expense.constants';

type CursorCreated = {
  readonly v: 1;
  readonly sort: typeof EXPENSE_FEED_SORT.CREATED_AT;
  readonly c: string;
  readonly i: string;
};

type CursorDate = {
  readonly v: 1;
  readonly sort: typeof EXPENSE_FEED_SORT.EXPENSE_DATE;
  readonly d: string;
  readonly i: string;
};

export function encodeExpenseFeedCursor(
  sort: ExpenseFeedSort,
  d: Date,
  id: string,
): string {
  const payload: CursorCreated | CursorDate =
    sort === EXPENSE_FEED_SORT.EXPENSE_DATE
      ? {
          v: 1,
          sort: EXPENSE_FEED_SORT.EXPENSE_DATE,
          d: d.toISOString().slice(0, 10),
          i: id,
        }
      : {
          v: 1,
          sort: EXPENSE_FEED_SORT.CREATED_AT,
          c: d.toISOString(),
          i: id,
        };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeExpenseFeedCursor(
  raw: string | undefined,
  expectedSort: ExpenseFeedSort,
): {
  sort: typeof EXPENSE_FEED_SORT.CREATED_AT;
  createdAt: Date;
  id: string;
} | {
  sort: typeof EXPENSE_FEED_SORT.EXPENSE_DATE;
  expenseDate: Date;
  id: string;
} {
  if (!raw?.length) {
    throw new ExpenseInvalidCursorException();
  }
  let parsed: unknown;
  try {
    const buf = Buffer.from(raw, 'base64url');
    parsed = JSON.parse(buf.toString('utf8')) as unknown;
  } catch {
    try {
      const buf = Buffer.from(raw, 'base64');
      parsed = JSON.parse(buf.toString('utf8')) as unknown;
    } catch {
      throw new ExpenseInvalidCursorException();
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new ExpenseInvalidCursorException();
  }
  const o = parsed as Record<string, unknown>;
  if (o['v'] !== 1 || typeof o['i'] !== 'string') {
    throw new ExpenseInvalidCursorException();
  }
  const id = o['i'] as string;
  const sortIn = o['sort'];
  if (sortIn === EXPENSE_FEED_SORT.EXPENSE_DATE) {
    if (expectedSort !== EXPENSE_FEED_SORT.EXPENSE_DATE) {
      throw new ExpenseInvalidCursorException(
        'Cursor sort does not match requested feed sort.',
      );
    }
    const ds = o['d'];
    if (typeof ds !== 'string') throw new ExpenseInvalidCursorException();
    const expenseDate = new Date(`${ds}T00:00:00.000Z`);
    if (Number.isNaN(expenseDate.getTime())) {
      throw new ExpenseInvalidCursorException();
    }
    return { sort: EXPENSE_FEED_SORT.EXPENSE_DATE, expenseDate, id };
  }
  if (sortIn === EXPENSE_FEED_SORT.CREATED_AT) {
    if (expectedSort !== EXPENSE_FEED_SORT.CREATED_AT) {
      throw new ExpenseInvalidCursorException(
        'Cursor sort does not match requested feed sort.',
      );
    }
    const cs = o['c'];
    if (typeof cs !== 'string') throw new ExpenseInvalidCursorException();
    const createdAt = new Date(cs);
    if (Number.isNaN(createdAt.getTime())) {
      throw new ExpenseInvalidCursorException();
    }
    return { sort: EXPENSE_FEED_SORT.CREATED_AT, createdAt, id };
  }
  throw new ExpenseInvalidCursorException();
}
