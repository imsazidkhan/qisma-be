/** **`GET …/comments`** — chronological oldest→newest (default, backward compatible). */
export const EXPENSE_COMMENT_SORT_ASC = 'asc';

/** **`GET …/comments`** — newest first; **`nextCursor`** loads **older** messages (chat / inverted list). */
export const EXPENSE_COMMENT_SORT_DESC = 'desc';

export type ExpenseCommentListSort =
  | typeof EXPENSE_COMMENT_SORT_ASC
  | typeof EXPENSE_COMMENT_SORT_DESC;

export function normalizeExpenseCommentListSort(
  raw: string | undefined,
): ExpenseCommentListSort {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === EXPENSE_COMMENT_SORT_DESC) return EXPENSE_COMMENT_SORT_DESC;
  return EXPENSE_COMMENT_SORT_ASC;
}
