import { ExpenseInvalidCursorException } from '../../../common/exceptions/api.exception';

import {
  EXPENSE_COMMENT_SORT_ASC,
  EXPENSE_COMMENT_SORT_DESC,
} from '../constants/expense-comment-sort.constants';
import {
  decodeExpenseCommentCursor,
  encodeExpenseCommentCursor,
} from './expense-comment-cursor';

describe('expense-comment-cursor', () => {
  const d = new Date('2026-05-01T12:00:00.000Z');
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('roundtrips asc with encoded s', () => {
    const raw = encodeExpenseCommentCursor(d, id, undefined, EXPENSE_COMMENT_SORT_ASC);
    const decoded = decodeExpenseCommentCursor(raw, undefined, EXPENSE_COMMENT_SORT_ASC);
    expect(decoded.id).toBe(id);
    expect(decoded.createdAt.getTime()).toBe(d.getTime());
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as { s?: string };
    expect(parsed['s']).toBe('asc');
  });

  it('roundtrips desc', () => {
    const raw = encodeExpenseCommentCursor(d, id, undefined, EXPENSE_COMMENT_SORT_DESC);
    const decoded = decodeExpenseCommentCursor(raw, undefined, EXPENSE_COMMENT_SORT_DESC);
    expect(decoded.id).toBe(id);
    expect(decoded.createdAt.getTime()).toBe(d.getTime());
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as { s?: string };
    expect(parsed['s']).toBe('desc');
  });

  it('legacy cursor without s works only for asc', () => {
    const legacyPayload = {
      v: 1,
      c: d.toISOString(),
      i: id,
      p: null,
    };
    const raw = Buffer.from(JSON.stringify(legacyPayload), 'utf8').toString('base64url');
    const decoded = decodeExpenseCommentCursor(raw, undefined, EXPENSE_COMMENT_SORT_ASC);
    expect(decoded.id).toBe(id);
    expect(decoded.createdAt.getTime()).toBe(d.getTime());
    expect(() =>
      decodeExpenseCommentCursor(raw, undefined, EXPENSE_COMMENT_SORT_DESC),
    ).toThrow(ExpenseInvalidCursorException);
  });

  it('rejects desc cursor when query is asc', () => {
    const raw = encodeExpenseCommentCursor(d, id, undefined, EXPENSE_COMMENT_SORT_DESC);
    expect(() =>
      decodeExpenseCommentCursor(raw, undefined, EXPENSE_COMMENT_SORT_ASC),
    ).toThrow(ExpenseInvalidCursorException);
  });
});
