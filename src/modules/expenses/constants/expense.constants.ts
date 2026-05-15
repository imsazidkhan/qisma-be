/** Default page size for **GET /v1/groups/:groupId/expenses**. */
export const EXPENSE_FEED_DEFAULT_LIMIT = 20;

/** Max page size for expense feeds. */
export const EXPENSE_FEED_MAX_LIMIT = 100;

/** Default page size for **GET …/expenses/:expenseId/comments**. */
export const EXPENSE_COMMENT_LIST_DEFAULT_LIMIT = EXPENSE_FEED_DEFAULT_LIMIT;

/** Max page size for expense comment lists. */
export const EXPENSE_COMMENT_LIST_MAX_LIMIT = EXPENSE_FEED_MAX_LIMIT;

/**
 * Expense **detail** embeds at most this many **latest** comments (chronological slice).
 * Full history: **GET …/expenses/:expenseId/comments**.
 */
export const EXPENSE_DETAIL_COMMENT_PREVIEW_LIMIT = 50;

/** Feed ordering for **GET …/groups/:groupId/expenses**. */
export const EXPENSE_FEED_SORT = {
  CREATED_AT: 'created_at',
  EXPENSE_DATE: 'expense_date',
} as const;

export type ExpenseFeedSort =
  (typeof EXPENSE_FEED_SORT)[keyof typeof EXPENSE_FEED_SORT];
