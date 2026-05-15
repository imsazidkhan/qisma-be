import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ClassifyExpenseBodyDto {
  @ApiProperty({ description: 'Free-text title to classify' })
  @IsString()
  @Length(1, 500)
  title!: string;
}

export class TaxonomyIconDto {
  @ApiProperty({ enum: ['emoji', 'glyph'], description: '**glyph** = ASCII key for client icon fonts; **emoji** = literal unicode glyph.' })
  kind!: 'emoji' | 'glyph';

  @ApiProperty({ description: 'Emoji character or glyph key (e.g. **restaurant**).' })
  value!: string;
}

export class TaxonomyTierDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional({ type: TaxonomyIconDto, nullable: true })
  icon!: TaxonomyIconDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Optional raster/SVG URL from taxonomy.' })
  iconUrl!: string | null;
}

/** Feed + detail + classify: **primary** = category, **secondary** = subcategory when set. */
export class ExpenseCategoryDisplayDto {
  @ApiProperty({ type: TaxonomyTierDto })
  primary!: TaxonomyTierDto;

  @ApiPropertyOptional({ type: TaxonomyTierDto, nullable: true })
  secondary!: TaxonomyTierDto | null;
}

export class ClassifierMerchantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  normalizedName!: string;
}

export class ClassifierTagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  color!: string | null;
}

export class ClassificationHintsDto {
  @ApiProperty()
  isFallback!: boolean;

  @ApiProperty()
  shouldPromptCorrection!: boolean;

  @ApiPropertyOptional({ nullable: true, type: [TaxonomyTierDto] })
  suggestedAlternatives!: TaxonomyTierDto[] | null;
}

export class ClassifyExpenseResponseDto {
  @ApiPropertyOptional({ nullable: true, type: ExpenseCategoryDisplayDto })
  category!: ExpenseCategoryDisplayDto | null;

  @ApiPropertyOptional({ nullable: true, type: ClassifierMerchantResponseDto })
  merchant!: ClassifierMerchantResponseDto | null;

  @ApiProperty({ type: [ClassifierTagResponseDto] })
  tags!: ClassifierTagResponseDto[];

  @ApiProperty({ type: ClassificationHintsDto })
  classification!: ClassificationHintsDto;
}

export class ReclassifyExpenseResponseDto {
  @ApiProperty()
  ok!: boolean;
}

export class SubcategoryTreeItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional({ type: TaxonomyIconDto, nullable: true })
  icon!: TaxonomyIconDto | null;

  @ApiPropertyOptional({ nullable: true })
  iconUrl!: string | null;
}

export class CategoryTreeItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional({ type: TaxonomyIconDto, nullable: true })
  icon!: TaxonomyIconDto | null;

  @ApiPropertyOptional({ nullable: true })
  iconUrl!: string | null;

  @ApiProperty({ type: [SubcategoryTreeItemDto] })
  subcategories!: SubcategoryTreeItemDto[];
}

export class ReclassifyExpenseBodyDto {
  @ApiProperty({ description: 'Target category slug' })
  @IsString()
  categorySlug!: string;

  @ApiPropertyOptional({ description: 'Subcategory slug (optional)' })
  @IsOptional()
  @IsString()
  subcategorySlug?: string | null;
}
