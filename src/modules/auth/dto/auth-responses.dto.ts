import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDataDto {
  @ApiProperty({
    description: 'New short-lived access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJlNDg...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'New refresh token (old one is now invalidated)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJlNDg...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Token type (always Bearer)',
    example: 'Bearer',
    enum: ['Bearer'],
  })
  tokenType!: 'Bearer';
}

export class RefreshTokenResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RefreshTokenDataDto })
  data!: RefreshTokenDataDto;
}

export class LogoutDataDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LogoutDataDto })
  data!: LogoutDataDto;
}
