import { ApiProperty } from '@nestjs/swagger';

export class CategoryBreakdownRowDto {
  @ApiProperty({ nullable: true })
  categoryId!: string | null;

  @ApiProperty()
  categorySlug!: string | null;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  expenseCount!: number;
}

export class MonthlyTrendRowDto {
  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  expenseCount!: number;
}

export class TopSpenderRowDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  totalPaidAmount!: string;

  @ApiProperty()
  expenseCount!: number;
}

export class MerchantInsightRowDto {
  @ApiProperty({ nullable: true })
  merchantId!: string | null;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  expenseCount!: number;
}

export class HeatmapCellDto {
  @ApiProperty({
    description: '0–6 (**UTC**) per **Expense.expenseDayOfWeek** / COALESCE extractor',
    minimum: 0,
    maximum: 6,
  })
  dayOfWeek!: number;

  @ApiProperty({ minimum: 0, maximum: 23 })
  hour!: number;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  expenseCount!: number;
}

export class RecurringInsightDto {
  @ApiProperty({ description: 'Distinct recurring cluster ids (**recurringGroupId**)' })
  clusterCount!: number;

  @ApiProperty()
  flaggedExpenseCount!: number;

  @ApiProperty()
  avgConfidence!: string | null;
}
