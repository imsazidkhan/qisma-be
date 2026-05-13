import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Allow,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Validate,
} from 'class-validator';

import { ExactlyOneMemberLookupConstraint } from './exactly-one-member-lookup.constraint';

/** Body for `POST /v1/groups/:groupId/members`: exactly **one** lookup field. */
export class AddGroupMemberDto {
  @ApiHideProperty()
  @Validate(ExactlyOneMemberLookupConstraint)
  @Allow()
  readonly _enforceExactlyOneLookup!: undefined;
  @ApiPropertyOptional({
    description:
      'Target user phone (`User.identifier`): digits normalized like OTP. **If nobody is registered**, creates **`group_invites`**. After **OTP verify**, those become **`group_members` `pending`**; invitee **`POST …/invites/accept`** or decline.',
    example: '+8801712345678',
    pattern: '^\\+?[1-9]\\d{9,14}$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (value.trim() || undefined) : value,
  )
  @IsOptional()
  @IsString({ message: 'identifier must be a string' })
  @IsNotEmpty({ message: 'identifier cannot be empty' })
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message:
      'identifier must be a valid international phone (E.164-style) matching User.identifier',
  })
  identifier?: string;

  @ApiPropertyOptional({
    description:
      'Target user\'s normalized `username` (`[a-z0-9_]{3,32}`); case-insensitive.',
    example: 'jane_doe',
    pattern: '^[a-z0-9_]{3,32}$',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? (value.trim().toLowerCase().replace(/^@/, '') || undefined)
      : value,
  )
  @IsOptional()
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username cannot be empty' })
  @Matches(/^[a-z0-9_]{3,32}$/, {
    message:
      'username must be 3–32 characters: lowercase letters, digits, underscore',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Target user UUID.',
    format: 'uuid',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (value.trim() || undefined) : value,
  )
  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'userId must be a UUID' })
  userId?: string;
}
