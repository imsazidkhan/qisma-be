import { ExpenseInvalidCursorException } from '../../../common/exceptions/api.exception';

import type { ExpenseCommentListSort } from '../constants/expense-comment-sort.constants';
import {
  EXPENSE_COMMENT_SORT_ASC,
  EXPENSE_COMMENT_SORT_DESC,
} from '../constants/expense-comment-sort.constants';

/**
 * Opaque cursor for **GET …/expenses/:expenseId/comments**.
 *
 * Payload (`base64url` JSON): **`{ v: 1, c, i, p, s? }`**
 * — **`p`** matches **`parentCommentId`** query scope; **`s`** is **`asc`** | **`desc`** (omit = **`asc`** legacy).
 */
type ExpenseCommentCursorV1 = {
  readonly v: 1;
  /** `ExpenseComment.createdAt` ISO string */
  readonly c: string;
  /** `ExpenseComment.id` */
  readonly i: string;
  /** Same scope as query: `null` = top-level only (`parentCommentId IS NULL`). */
  readonly p: string | null;
  /** Pagination direction; encoded on new cursors — old tokens without **`s`** imply **`asc`**. */
  readonly s?: ExpenseCommentListSort;
};

function normalizeParentScope(parentCommentId: string | undefined): string | null {
  return parentCommentId?.trim() ? parentCommentId : null;
}

export function encodeExpenseCommentCursor(
  createdAt: Date,
  id: string,
  parentCommentId: string | undefined,
  sort: ExpenseCommentListSort,
): string {
  const payload: ExpenseCommentCursorV1 = {
    v: 1,
    c: createdAt.toISOString(),
    i: id,
    p: normalizeParentScope(parentCommentId),
    s: sort,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeExpenseCommentCursor(
  raw: string | undefined,
  parentCommentIdQuery: string | undefined,
  sortQuery: ExpenseCommentListSort,
): { createdAt: Date; id: string } {
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
  const cs = o['c'];
  if (typeof cs !== 'string') throw new ExpenseInvalidCursorException();
  const createdAt = new Date(cs);
  if (Number.isNaN(createdAt.getTime())) {
    throw new ExpenseInvalidCursorException();
  }
  const id = o['i'] as string;
  const pRaw = o['p'];
  const pDecoded = pRaw === null || pRaw === undefined ? null : pRaw;
  if (pDecoded !== null && typeof pDecoded !== 'string') {
    throw new ExpenseInvalidCursorException();
  }
  const expected = normalizeParentScope(parentCommentIdQuery);
  if (pDecoded !== expected) {
    throw new ExpenseInvalidCursorException(
      'Comment pagination cursor does not match parentCommentId scope.',
    );
  }

  const sRaw = o['s'];
  let cursorSort: ExpenseCommentListSort;
  if (sRaw === undefined || sRaw === null) {
    cursorSort = EXPENSE_COMMENT_SORT_ASC;
  } else if (sRaw === EXPENSE_COMMENT_SORT_DESC) {
    cursorSort = EXPENSE_COMMENT_SORT_DESC;
  } else if (sRaw === EXPENSE_COMMENT_SORT_ASC) {
    cursorSort = EXPENSE_COMMENT_SORT_ASC;
  } else {
    throw new ExpenseInvalidCursorException();
  }
  if (cursorSort !== sortQuery) {
    throw new ExpenseInvalidCursorException(
      'Comment pagination cursor sort does not match query.',
    );
  }

  return { createdAt, id };
}
