import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  EXPENSE_FEED_DEFAULT_LIMIT,
  EXPENSE_FEED_MAX_LIMIT,
  EXPENSE_FEED_SORT,
} from '../constants/expense.constants';

export class ListExpensesQueryDto {
  @ApiPropertyOptional({ enum: EXPENSE_FEED_SORT, default: EXPENSE_FEED_SORT.CREATED_AT })
  @IsOptional()
  @IsIn([EXPENSE_FEED_SORT.CREATED_AT, EXPENSE_FEED_SORT.EXPENSE_DATE])
  readonly sort?: (typeof EXPENSE_FEED_SORT)[keyof typeof EXPENSE_FEED_SORT];

  @ApiPropertyOptional({ description: 'Opaque pagination token from previous page' })
  @IsOptional()
  @IsString()
  readonly cursor?: string;

  @ApiPropertyOptional({
    default: EXPENSE_FEED_DEFAULT_LIMIT,
    maximum: EXPENSE_FEED_MAX_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : EXPENSE_FEED_DEFAULT_LIMIT;
  })
  @Min(1)
  @Max(EXPENSE_FEED_MAX_LIMIT)
  readonly limit?: number;

  @ApiPropertyOptional({ description: 'Case-insensitive title search' })
  @IsOptional()
  @IsString()
  readonly q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  readonly categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly toDate?: string;

  @ApiPropertyOptional({
    description: 'When **true**, include soft-deleted expenses (**default: false**).',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  readonly includeDeleted?: boolean;
}
