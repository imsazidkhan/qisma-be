/** Stored / API split type discriminator (`Expense.splitType`). */
export const EXPENSE_SPLIT_TYPE = {
  EQUAL: 'equal',
  EXACT: 'exact',
  PERCENTAGE: 'percentage',
  SHARES: 'shares',
  ADJUSTMENT: 'adjustment',
  ITEMIZED: 'itemized',
} as const;

export type ExpenseSplitType =
  (typeof EXPENSE_SPLIT_TYPE)[keyof typeof EXPENSE_SPLIT_TYPE];
