import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CONTACT_SYNC_CONSTANTS } from '../constants/contact-sync.constants';

export class SyncContactEntryDto {
  @ApiProperty({
    description:
      'Phone in any plausible format (`+`/spaces OK). Parsed to **validated E.164** (subscriber digits aligned with `User.identifier`) using your account locale + **`CONTACT_SYNC_DEFAULT_COUNTRY`**. Invalid entries → **400**.',
    example: '+91 98765 43210',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(48)
  identifier!: string;
}

export class SyncContactsBodyDto {
  @ApiProperty({
    type: SyncContactEntryDto,
    isArray: true,
    description:
      'Replaces the user’s synced snapshot (**empty clears** rows). Phones **must satisfy E.164** after parsing (**400** otherwise).',
  })
  @IsArray()
  @ArrayMaxSize(CONTACT_SYNC_CONSTANTS.MAX_CONTACTS)
  @ValidateNested({ each: true })
  @Type(() => SyncContactEntryDto)
  contacts!: SyncContactEntryDto[];
}
