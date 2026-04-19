import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDataDto {
  @ApiProperty({
    description: 'Session ID to pass to /otp/verify',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  sessionId!: string;

  @ApiProperty({
    description: 'Unix timestamp (ms) when the OTP expires',
    example: 1726000300000,
  })
  expiresAt!: number;

  @ApiProperty({
    description: 'Seconds to wait before requesting another OTP (cooldown)',
    example: 60,
  })
  retryAfter!: number;
}

export class SendOtpResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SendOtpDataDto })
  data!: SendOtpDataDto;
}

export class VerifyOtpDataDto {
  @ApiProperty({
    description: 'Short-lived JWT access token (15 min)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJlNDg...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived JWT refresh token (7 days)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJlNDg...',
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

export class VerifyOtpResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: VerifyOtpDataDto })
  data!: VerifyOtpDataDto;
}
