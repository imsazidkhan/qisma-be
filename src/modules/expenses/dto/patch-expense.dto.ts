import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsISO8601,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ExpenseSplitPayloadDto } from './create-expense.dto';

export class PatchExpenseBodyDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpenseSplitPayloadDto)
  split?: ExpenseSplitPayloadDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  paidByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagSlugs?: string[];

  /**
   * Echo **`updatedAt`** from the last **GET …/expenses/:id** load. **409** if the row changed.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
