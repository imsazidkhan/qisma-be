import { ApiProperty } from '@nestjs/swagger';

/**
 * **BE Task 7 — minimal user payload** for each **`registered`** contact.
 * Only **`id`**, **`name`**, **`username`**, and **`avatar`** are returned (no phone / internal fields).
 */
export class ContactMatchUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Public avatar URL',
  })
  avatar!: string | null;
}

export class ContactSyncDataDto {
  @ApiProperty({
    description:
      'Count of unique normalized phones stored after this sync (what passed validation).',
  })
  syncedCount!: number;

  @ApiProperty({
    type: ContactMatchUserDto,
    isArray: true,
    description:
      'Active **User** hits with **identifier** in your upload, **excluding**: you, anyone **active** with you in the same group, anyone **pending** on a group where you are **active**. Each object exposes **only**: **id**, **name**, **username**, **avatar**.',
  })
  registered!: ContactMatchUserDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    description:
      'Normalized E.164 digit strings from your upload with **no** active **User** row for that **identifier**.',
  })
  unregistered!: string[];
}

export class ContactSyncResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ContactSyncDataDto })
  data!: ContactSyncDataDto;
}
