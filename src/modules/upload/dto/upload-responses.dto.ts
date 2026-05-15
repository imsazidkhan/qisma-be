import { ApiProperty } from '@nestjs/swagger';

export class AvatarUploadDataDto {
  @ApiProperty({
    description:
      'Public URL of the uploaded avatar. Set this on `PATCH /v1/auth/me` `avatarUrl`.',
    example: 'https://api.example.com/v1/uploads/avatars/abc123.jpg',
  })
  url!: string;
}

export class AvatarUploadResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AvatarUploadDataDto })
  data!: AvatarUploadDataDto;
}
