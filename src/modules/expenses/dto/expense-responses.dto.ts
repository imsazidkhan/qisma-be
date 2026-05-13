import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CategoryTaxonomy } from './classify-expense.dto';

export class ExpenseTaxonomyDisplayDto {
  @ApiProperty({ description: '**text** = category (label); **icon** = subcategory visual slug' })
  text!: CategoryTaxonomy;

  @ApiPropertyOptional({ nullable: true })
  icon!: CategoryTaxonomy | null;
}

export class ExpenseUserSnippetDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiPropertyOptional()
  username!: string | null;

  @ApiPropertyOptional()
  avatar!: string | null;
}

export class ExpenseFeedItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  taxonomy!: ExpenseTaxonomyDisplayDto | null;

  @ApiProperty()
  paidBy!: ExpenseUserSnippetDto;

  @ApiPropertyOptional({ nullable: true })
  receiptUrl!: string | null;
}

export class ExpenseFeedPageDto {
  @ApiProperty({ type: [ExpenseFeedItemDto] })
  items!: ExpenseFeedItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

export class ExpenseParticipantDetailDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  owedAmount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiPropertyOptional()
  user!: ExpenseUserSnippetDto;
}

export class ExpenseDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  splitType!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  taxonomy!: ExpenseTaxonomyDisplayDto | null;

  @ApiProperty()
  paidBy!: ExpenseUserSnippetDto;

  @ApiProperty({ type: [ExpenseParticipantDetailDto] })
  participants!: ExpenseParticipantDetailDto[];

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiPropertyOptional()
  description!: string | null;
}

export class ExpenseCommentEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  user!: ExpenseUserSnippetDto;
}

export class ExpenseReactionEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  emoji!: string;

  @ApiProperty()
  createdAt!: string;
}

export class ExpenseAttachmentEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  createdAt!: string;
}

export class ExpenseHistoryEntryDto {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  actor!: ExpenseUserSnippetDto | null;

  @ApiPropertyOptional()
  metadata!: Record<string, unknown>;
}

export class ExpenseDetailWithRelationsDto extends ExpenseDetailDto {
  @ApiProperty({ type: [ExpenseCommentEntryDto] })
  comments!: ExpenseCommentEntryDto[];

  @ApiProperty({ type: [ExpenseReactionEntryDto] })
  reactions!: ExpenseReactionEntryDto[];

  @ApiProperty({ type: [ExpenseAttachmentEntryDto] })
  attachments!: ExpenseAttachmentEntryDto[];

  @ApiProperty({ type: [ExpenseHistoryEntryDto] })
  activityLogs!: ExpenseHistoryEntryDto[];
}

export class ExpenseMutationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class GroupBalanceSummaryDto {
  @ApiProperty({
    description: 'Viewer net position in **minor units** (e.g. paise) — **string** integer',
  })
  netMinor!: string;

  @ApiProperty()
  currency!: string;
}

export class GroupBalanceLineDto {
  @ApiProperty()
  fromUserId!: string;

  @ApiProperty()
  toUserId!: string;

  @ApiProperty({ description: 'Minor units — string integer' })
  amountMinor!: string;
}

export class GroupBalanceSnapshotDto {
  @ApiProperty({ type: [GroupBalanceLineDto] })
  balances!: GroupBalanceLineDto[];

  @ApiProperty({ type: GroupBalanceSummaryDto })
  summary!: GroupBalanceSummaryDto;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  dominantCurrency!: string;
}

export class GroupBalanceViewerUserDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiPropertyOptional()
  username!: string | null;

  @ApiPropertyOptional()
  avatar!: string | null;
}

export class GroupBalanceViewDto {
  @ApiProperty({ type: GroupBalanceSnapshotDto })
  groupBalances!: GroupBalanceSnapshotDto;

  @ApiProperty({
    type: [GroupBalanceLineDto],
    description: 'Settlement edges involving the viewer',
  })
  balances!: GroupBalanceLineDto[];

  @ApiProperty({ type: GroupBalanceSummaryDto })
  summary!: GroupBalanceSummaryDto;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  dominantCurrency!: string;

  @ApiPropertyOptional({ type: [GroupBalanceViewerUserDto] })
  peers!: GroupBalanceViewerUserDto[];
}
