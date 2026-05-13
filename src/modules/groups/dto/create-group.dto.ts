import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

import { GROUP_CONSTANTS } from '../constants/group.constants';
import { GROUP_TYPE_SLUGS } from '../constants/group-type.constants';

const TYPE_VALUES = [...GROUP_TYPE_SLUGS];

export class CreateGroupDto {
  @ApiProperty({
    description: 'Display name for the group.',
    example: 'Goa Trip',
    minLength: GROUP_CONSTANTS.NAME_MIN_LENGTH,
    maxLength: GROUP_CONSTANTS.NAME_MAX_LENGTH,
    required: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(GROUP_CONSTANTS.NAME_MIN_LENGTH, {
    message: `name must be at least ${String(GROUP_CONSTANTS.NAME_MIN_LENGTH)} character(s) after trimming`,
  })
  @MaxLength(GROUP_CONSTANTS.NAME_MAX_LENGTH, {
    message: `name must be at most ${String(GROUP_CONSTANTS.NAME_MAX_LENGTH)} characters`,
  })
  name!: string;

  @ApiProperty({
    description: 'Group category.',
    example: 'trip',
    enum: GROUP_TYPE_SLUGS,
    required: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsIn(TYPE_VALUES, {
    message: `type must be one of: ${TYPE_VALUES.join(', ')}`,
  })
  type!: string;

  @ApiPropertyOptional({
    description:
      'Optional public URL for the group image (`http` or `https`). Omit when not set.',
    example: 'https://cdn.app.com/group.png',
    maxLength: 2048,
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      const t = value.trim();
      return t.length === 0 ? undefined : t;
    }
    return value;
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'avatar must be at most 2048 characters' })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'avatar must be a valid http(s) URL' },
  )
  avatar?: string;
}
