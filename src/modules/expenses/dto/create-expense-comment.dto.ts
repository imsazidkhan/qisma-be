import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const EXPENSE_COMMENT_MESSAGE_MAX_LENGTH = 8000;

export class CreateExpenseCommentBodyDto {
  @ApiProperty({ maxLength: EXPENSE_COMMENT_MESSAGE_MAX_LENGTH })
  @IsString()
  @MaxLength(EXPENSE_COMMENT_MESSAGE_MAX_LENGTH)
  message!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Reply to this comment (**same expense**); omit for a top-level comment.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (value.trim() || undefined) : value,
  )
  @IsUUID('4')
  parentCommentId?: string;
}
