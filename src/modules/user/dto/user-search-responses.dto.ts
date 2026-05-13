import { ApiProperty } from '@nestjs/swagger';

/** One directory hit — fields in API order: `id`, `name`, `username`, `avatar`. */
export class UserSearchHitDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'jane_doe' })
  username!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Avatar URL (`User.avatarUrl`), or null.',
  })
  avatar!: string | null;
}

/** `GET /v1/users/search` success body. */
export class UserSearchListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: UserSearchHitDto,
    isArray: true,
    description:
      'Up to 20 matches (`q` across phone + username + name). Caller excluded; no raw phone field.',
  })
  data!: UserSearchHitDto[];
}
