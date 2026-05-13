import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export const EXPENSE_COMMENT_MESSAGE_MAX_LENGTH = 8000;

export class CreateExpenseCommentBodyDto {
  @ApiProperty({ maxLength: EXPENSE_COMMENT_MESSAGE_MAX_LENGTH })
  @IsString()
  @MaxLength(EXPENSE_COMMENT_MESSAGE_MAX_LENGTH)
  message!: string;
}
