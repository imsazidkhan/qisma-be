import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { USER_CONSTANTS } from '../constants/user.constants';

/** Query for `GET /v1/users/search` — unified text search `q`. */
export class SearchUsersQueryDto {
  @ApiProperty({
    description:
      'Search text: matched as **full phone** (E.164-style when valid), **username** prefix (`[a-z0-9_]`), and **display name** (case-insensitive contains).',
    example: 'jane',
    minLength: USER_CONSTANTS.SEARCH_QUERY_MIN_LENGTH,
    maxLength: USER_CONSTANTS.SEARCH_QUERY_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'q must not be empty' })
  @MinLength(USER_CONSTANTS.SEARCH_QUERY_MIN_LENGTH, {
    message: `q must be at least ${String(USER_CONSTANTS.SEARCH_QUERY_MIN_LENGTH)} characters`,
  })
  @MaxLength(USER_CONSTANTS.SEARCH_QUERY_MAX_LENGTH)
  q!: string;
}
