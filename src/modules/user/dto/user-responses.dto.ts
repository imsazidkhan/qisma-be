import { ApiProperty } from '@nestjs/swagger';

/** Payload for authenticated profile / user-detail responses */
export class UserProfileDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Stable user identifier (e.g. normalized phone)',
    example: '+15551234567',
  })
  identifier!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Display name; null until set via PATCH /auth/me',
    example: 'Alex Rivera',
  })
  name!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Avatar image URL; null until set (POST /upload/avatar + PATCH /auth/me).',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Use-case slug from onboarding (Screen 3); null until set via PATCH /auth/me.',
    example: 'personal',
  })
  useCase!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Server timestamp when onboarding was completed (`onboardingCompleted: true` on final step); null until then.',
  })
  onboardingCompletedAt!: Date | null;

  @ApiProperty()
  phoneVerified!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserProfileDataDto })
  data!: UserProfileDataDto;
}

/**
 * Server-derived hints for client onboarding routing (GET /auth/me only).
 */
export class OnboardingStatusDto {
  @ApiProperty({
    description: 'True when a non-empty display name is stored (same criteria as PATCH name).',
  })
  hasDisplayName!: boolean;

  @ApiProperty({ description: 'True when `avatarUrl` is non-null and non-empty.' })
  hasAvatar!: boolean;

  @ApiProperty({
    description: 'True when `useCase` is non-null and non-empty.',
  })
  hasUseCase!: boolean;

  @ApiProperty({
    description: 'True when `onboardingCompletedAt` is set (final onboarding step recorded).',
  })
  isOnboardingComplete!: boolean;
}

/** GET /v1/auth/me — profile fields plus `onboarding` hints for cold-start routing. */
export class AuthMeDataDto extends UserProfileDataDto {
  @ApiProperty({ type: OnboardingStatusDto })
  onboarding!: OnboardingStatusDto;
}

export class AuthMeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AuthMeDataDto })
  data!: AuthMeDataDto;
}
