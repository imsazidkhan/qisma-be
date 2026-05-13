import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export const EXPENSE_REACTION_EMOJI_MAX_LENGTH = 32;

export class CreateExpenseReactionBodyDto {
  @ApiProperty({ maxLength: EXPENSE_REACTION_EMOJI_MAX_LENGTH })
  @IsString()
  @Length(1, EXPENSE_REACTION_EMOJI_MAX_LENGTH)
  emoji!: string;
}
