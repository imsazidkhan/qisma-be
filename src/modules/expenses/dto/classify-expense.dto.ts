import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ClassifyExpenseBodyDto {
  @ApiProperty({ description: 'Free-text title to classify' })
  @IsString()
  @Length(1, 500)
  title!: string;
}

export class CategoryTaxonomy {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  color!: string | null;
}

export class ClassifyTaxonomyDto {
  @ApiProperty({ type: CategoryTaxonomy })
  text!: CategoryTaxonomy;

  @ApiPropertyOptional({ type: CategoryTaxonomy, nullable: true })
  icon!: CategoryTaxonomy | null;
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

  @ApiPropertyOptional({ nullable: true, type: [CategoryTaxonomy] })
  suggestedAlternatives!: CategoryTaxonomy[] | null;
}

export class ClassifyExpenseResponseDto {
  @ApiPropertyOptional({ nullable: true, type: ClassifyTaxonomyDto })
  taxonomy!: ClassifyTaxonomyDto | null;

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
