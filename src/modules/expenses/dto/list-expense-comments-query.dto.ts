import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import {
  EXPENSE_COMMENT_SORT_ASC,
  EXPENSE_COMMENT_SORT_DESC,
} from '../constants/expense-comment-sort.constants';
import {
  EXPENSE_COMMENT_LIST_DEFAULT_LIMIT,
  EXPENSE_COMMENT_LIST_MAX_LIMIT,
} from '../constants/expense.constants';

export class ListExpenseCommentsQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque **pagination** token from **`data.nextCursor`**. Decodes to JSON **`{ v:1, c, i, p, s? }`** (base64url); **`p`** must match **`parentCommentId`**; **`s`** matches **`sort`** (`asc`|`desc`).',
  })
  @IsOptional()
  @IsString()
  readonly cursor?: string;

  @ApiPropertyOptional({
    default: EXPENSE_COMMENT_LIST_DEFAULT_LIMIT,
    maximum: EXPENSE_COMMENT_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : EXPENSE_COMMENT_LIST_DEFAULT_LIMIT;
  })
  @Min(1)
  @Max(EXPENSE_COMMENT_LIST_MAX_LIMIT)
  readonly limit?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Omit for **top-level** comments only. When set, return replies whose **parentCommentId** matches.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (value.trim() || undefined) : value,
  )
  @IsUUID('4')
  readonly parentCommentId?: string;

  @ApiPropertyOptional({
    enum: [EXPENSE_COMMENT_SORT_ASC, EXPENSE_COMMENT_SORT_DESC],
    default: EXPENSE_COMMENT_SORT_ASC,
    description:
      '**`asc`** (default) — oldest first, **`cursor`** loads newer rows. **`desc`** — newest first (chat-style); **`cursor`** loads **older** rows. Cursor **`s`** field must match.',
  })
  @IsOptional()
  @IsIn([EXPENSE_COMMENT_SORT_ASC, EXPENSE_COMMENT_SORT_DESC])
  readonly sort?: typeof EXPENSE_COMMENT_SORT_ASC | typeof EXPENSE_COMMENT_SORT_DESC;
}
