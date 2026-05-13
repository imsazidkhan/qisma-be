/** Default page size for **GET /v1/groups/:groupId/expenses**. */
export const EXPENSE_FEED_DEFAULT_LIMIT = 20;

/** Max page size for expense feeds. */
export const EXPENSE_FEED_MAX_LIMIT = 100;

/** Feed ordering for **GET …/expenses** and **GET …/me/expenses**. */
export const EXPENSE_FEED_SORT = {
  CREATED_AT: 'created_at',
  EXPENSE_DATE: 'expense_date',
} as const;

export type ExpenseFeedSort =
  (typeof EXPENSE_FEED_SORT)[keyof typeof EXPENSE_FEED_SORT];
