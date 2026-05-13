import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
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

import { EXPENSE_SPLIT_TYPE } from '../../splits/constants/expense-split.constants';

const SPLIT_TYPES = Object.values(EXPENSE_SPLIT_TYPE);

export class ItemizedLineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  label!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantUserIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  splitAmongEveryone?: boolean;
}

/** Polymorphic split configuration (discriminated by **splitType**). */
export class ExpenseSplitPayloadDto {
  @ApiProperty({ enum: SPLIT_TYPES })
  @IsString()
  @IsIn(SPLIT_TYPES)
  splitType!: (typeof EXPENSE_SPLIT_TYPE)[keyof typeof EXPENSE_SPLIT_TYPE];

  @ApiPropertyOptional({ type: [String], description: 'equal' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantUserIds?: string[];

  @ApiPropertyOptional({ description: 'exact' })
  @IsOptional()
  @IsObject()
  amountsByUserId?: Record<string, string>;

  @ApiPropertyOptional({ description: 'percentage' })
  @IsOptional()
  @IsObject()
  percentageByUserId?: Record<string, string>;

  @ApiPropertyOptional({ description: 'shares' })
  @IsOptional()
  @IsObject()
  sharesByUserId?: Record<string, string>;

  @ApiPropertyOptional({ description: 'adjustment' })
  @IsOptional()
  @IsObject()
  fixedAmountsByUserId?: Record<string, string>;

  @ApiPropertyOptional({ type: [String], description: 'adjustment' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  remainderUserIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'itemized' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allParticipantUserIds?: string[];

  @ApiPropertyOptional({ type: [ItemizedLineDto], description: 'itemized' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemizedLineDto)
  lines?: ItemizedLineDto[];
}

export class CreateExpenseBodyDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ description: 'Decimal string, major units (e.g. rupees)' })
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ example: '2025-05-10', description: 'UTC calendar date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 8000)
  notes?: string;

  @ApiProperty({ type: ExpenseSplitPayloadDto })
  @ValidateNested()
  @Type(() => ExpenseSplitPayloadDto)
  split!: ExpenseSplitPayloadDto;

  @ApiProperty({ description: 'Primary payer (single-tender netting in balance engine)' })
  @IsUUID('4')
  paidByUserId!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  location?: string;
}
