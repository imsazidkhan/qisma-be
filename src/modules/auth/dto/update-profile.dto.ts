import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  IsUrl,
  Validate,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { USER_CONSTANTS } from '../../user/constants/user.constants';
import { USER_USE_CASE_SLUGS } from '../../user/constants/use-case.constants';
import { sanitizeDisplayName } from '../../user/utils/display-name';
import { AtLeastOneProfileFieldConstraint } from './at-least-one-profile-field.validator';

const USE_CASE_VALUES = [...USER_USE_CASE_SLUGS];

export class UpdateProfileDto {
  /** Not sent by clients; triggers at-least-one-field validation. */
  @Allow()
  @Validate(AtLeastOneProfileFieldConstraint)
  _profileFields!: unknown;

  @ApiPropertyOptional({
    description:
      'Display name. Normalized (NFC), trimmed, internal whitespace collapsed, ASCII controls removed.',
    example: 'Alex Rivera',
    minLength: USER_CONSTANTS.NAME_MIN_LENGTH,
    maxLength: USER_CONSTANTS.NAME_MAX_LENGTH,
  })
  @ValidateIf((o: UpdateProfileDto) => o.name !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeDisplayName(value) : value,
  )
  @IsString({ message: 'Name must be a string' })
  @MinLength(USER_CONSTANTS.NAME_MIN_LENGTH, {
    message: `Name must be at least ${String(USER_CONSTANTS.NAME_MIN_LENGTH)} character(s) after trimming`,
  })
  @MaxLength(USER_CONSTANTS.NAME_MAX_LENGTH, {
    message: `Name must be at most ${String(USER_CONSTANTS.NAME_MAX_LENGTH)} characters`,
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Public URL of the avatar image (typically returned by POST /upload/avatar).',
    example: 'https://api.example.com/v1/uploads/avatars/abc.jpg',
    maxLength: 2048,
  })
  @ValidateIf((o: UpdateProfileDto) => o.avatarUrl !== undefined)
  @IsString()
  @MaxLength(2048, { message: 'avatarUrl must be at most 2048 characters' })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'avatarUrl must be a valid http(s) URL' },
  )
  avatarUrl?: string;

  @ApiPropertyOptional({
    description:
      'Product use-case slug (onboarding Screen 3). Must match a supported slug.',
    example: 'personal',
    enum: USER_USE_CASE_SLUGS,
  })
  @ValidateIf((o: UpdateProfileDto) => o.useCase !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsIn(USE_CASE_VALUES, {
    message: `useCase must be one of: ${USE_CASE_VALUES.join(', ')}`,
  })
  useCase?: string;

  @ApiPropertyOptional({
    description: `
Set \`true\` on the **final onboarding step** to record completion time.
Server sets \`onboardingCompletedAt\` **once** (when not already set); duplicate \`true\`
requests do not change the stored timestamp. Sending \`false\`
does not clear an existing completion (omit the field to leave unchanged).
`,
    example: true,
  })
  @ValidateIf((o: UpdateProfileDto) => o.onboardingCompleted !== undefined)
  @IsBoolean()
  onboardingCompleted?: boolean;
}
