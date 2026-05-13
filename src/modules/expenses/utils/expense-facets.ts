function dowUtc(d: Date): number {
  return d.getUTCDay();
}

function hourUtc(d: Date): number {
  return d.getUTCHours();
}

export type AnalyticsFacetFields = Readonly<{
  expenseYear: number;
  expenseMonth: number;
  expenseDayOfWeek: number;
  expenseHour: number;
}>;

/** Derives analytics facet columns from calendar **date**. */
export function computeExpenseAnalyticsFacets(dateOnly: Date): AnalyticsFacetFields {
  return {
    expenseYear: dateOnly.getUTCFullYear(),
    expenseMonth: dateOnly.getUTCMonth() + 1,
    expenseDayOfWeek: dowUtc(dateOnly),
    expenseHour: hourUtc(dateOnly),
  };
}
