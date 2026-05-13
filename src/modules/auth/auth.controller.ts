import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { User as PrismaUser } from '@prisma/client';
import type { Request } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { OtpService } from '../otp/otp.service';
import { TokenService } from './services/token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  RefreshTokenResponseDto,
  LogoutResponseDto,
} from './dto/auth-responses.dto';
import {
  AuthMeDataDto,
  AuthMeResponseDto,
  UserProfileDataDto,
  UserProfileResponseDto,
} from '../user/dto/user-responses.dto';
import { UserService } from '../user/user.service';
import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import {
  AccountInactiveException,
  RefreshTokenInvalidException,
  RefreshTokenExpiredException,
  InvalidSignatureException,
  TokenReusedException,
  InternalErrorException,
  UnauthorizedException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LogoutResponse {
  message: string;
}

function userToProfileData(user: PrismaUser): UserProfileDataDto {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    avatarUrl: user.avatarUrl,
    useCase: user.useCase,
    onboardingCompletedAt: user.onboardingCompletedAt,
    phoneVerified: user.phoneVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

function userToMeData(user: PrismaUser): AuthMeDataDto {
  const base = userToProfileData(user);
  return {
    ...base,
    onboarding: {
      hasDisplayName: Boolean(user.name?.trim()),
      hasAvatar: Boolean(user.avatarUrl?.trim()),
      hasUseCase: Boolean(user.useCase?.trim()),
      isOnboardingComplete: user.onboardingCompletedAt !== null,
    },
  };
}

@ApiTags('Auth')
@ApiExtraModels(ApiErrorDto, UserProfileResponseDto, AuthMeResponseDto, UpdateProfileDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly otpService: OtpService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // POST /v1/auth/refresh
  // ═══════════════════════════════════════════════════════════════════
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token → new access + refresh pair',
    description: `
Verifies the submitted refresh token, marks the old one as **used**, and issues
a brand-new access + refresh token pair.

### Token Rotation (RFC 6749 best practice)
- Old refresh token is **single-use**
- New refresh token shares the same \`familyId\` (so all tokens from one login are grouped)

### Reuse Detection (security-critical)
If a refresh token that has already been used is presented, this is treated as a **replay attack**:
- The entire token family is revoked (\`revokeFamily\`)
- All the user's sessions are revoked (\`revokedAt\` set + Redis flag)
- The attacker + the legitimate user are both logged out; the user must re-authenticate

### Audit
- Every new refresh token stores \`userAgent\` + \`ipAddress\` for multi-device visibility
- Old token's \`usedAt\` timestamp is recorded for audit trail

### Clock Tolerance
- 5 seconds of clock skew between client/server is tolerated
`,
  })
  // ─── SUCCESS ───────────────────────────────────────────────────
  @ApiResponse({
    status: 200,
    description: 'New token pair issued. Old refresh token is now invalid.',
    type: RefreshTokenResponseDto,
  })
  // ─── 400 Bad Request ───────────────────────────────────────────
  @ApiResponse({
    status: 400,
    description: 'Refresh token missing from body.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          REFRESH_TOKEN_REQUIRED: {
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Refresh token is required',
                details: ['Refresh token is required'],
              },
            },
          },
        },
      },
    },
  })
  // ─── 401 Unauthorized ──────────────────────────────────────────
  @ApiResponse({
    status: 401,
    description:
      'Token is invalid, expired, reused, or the session is revoked.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          REFRESH_TOKEN_INVALID: {
            summary: 'Token structure valid, but not in DB / already revoked',
            value: {
              success: false,
              error: {
                code: 'REFRESH_TOKEN_INVALID',
                message: 'Refresh token is invalid or has been revoked.',
              },
            },
          },
          REFRESH_TOKEN_EXPIRED: {
            summary: 'JWT expired (>7 days old)',
            value: {
              success: false,
              error: {
                code: 'REFRESH_TOKEN_EXPIRED',
                message: 'Refresh token has expired. Please login again.',
              },
            },
          },
          INVALID_SIGNATURE: {
            summary: 'Token signed with wrong secret (tampered)',
            value: {
              success: false,
              error: {
                code: 'INVALID_SIGNATURE',
                message: 'Token signature is invalid.',
              },
            },
          },
          TOKEN_REUSED: {
            summary:
              'Already-rotated token presented again — full session revoked',
            value: {
              success: false,
              error: {
                code: 'TOKEN_REUSED',
                message:
                  'Token reuse detected. All sessions have been revoked for security.',
              },
            },
          },
          SESSION_REVOKED: {
            summary: 'User was force-logged-out (admin action)',
            value: {
              success: false,
              error: {
                code: 'SESSION_REVOKED',
                message: 'Session has been revoked. Please login again.',
              },
            },
          },
        },
      },
    },
  })
  // ─── 500 Internal Server Error ─────────────────────────────────
  @ApiResponse({
    status: 500,
    description: 'Unexpected failure (DB or Redis unavailable).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          INTERNAL_ERROR: {
            value: {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Unable to process request. Please try again.',
              },
            },
          },
        },
      },
    },
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<ApiSuccessResponse<RefreshTokenResponse>> {
    try {
      const userAgent = req.headers['user-agent'];
      const { tokens } = await this.tokenService.rotateRefreshToken(
        dto.refreshToken,
        {
          ...(userAgent && { userAgent }),
          ipAddress: ip,
        },
      );

      return {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
        },
      };
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw new RefreshTokenExpiredException();
      }

      if (error instanceof JsonWebTokenError) {
        if (error.message.includes('signature')) {
          throw new InvalidSignatureException();
        }
        throw new RefreshTokenInvalidException();
      }

      if (error instanceof Error) {
        if (error.message === 'TOKEN_REUSED') {
          throw new TokenReusedException();
        }
        if (error.message === 'INVALID_REFRESH_TOKEN') {
          throw new RefreshTokenInvalidException();
        }
      }

      throw new InternalErrorException();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // POST /v1/auth/logout
  // ═══════════════════════════════════════════════════════════════════
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke refresh token (idempotent)',
    description: `
Marks the provided refresh token as revoked (\`isValid=false\`, \`revokedAt\` set).

### Idempotency
- Safe to call **any number of times** with the same token
- Safe to call with an **invalid / expired** token (silently succeeds)
- Always returns \`200 OK\` unless the request body itself is malformed
- The corresponding access token will continue to work until it expires naturally (usually <15 min)

### Force-Logout-All-Devices
For a full security logout across all devices, use \`TokenService.revokeUserSessions(userId)\` — this sets a Redis revocation marker that invalidates all access tokens issued before the marker timestamp, in addition to revoking all refresh tokens in DB.

### OTP send cooldown (product trade-off)
When the refresh JWT is valid, the server clears the **per-phone** Redis cooldown used by \`POST /otp/send\`
so the same user can request a new code immediately after logging out from this device session.
Malformed or expired tokens still revoke idempotently but skip cooldown clearance.
`,
  })
  // ─── SUCCESS ───────────────────────────────────────────────────
  @ApiResponse({
    status: 200,
    description: 'Logout successful (idempotent).',
    type: LogoutResponseDto,
  })
  // ─── 400 Bad Request ───────────────────────────────────────────
  @ApiResponse({
    status: 400,
    description: 'Refresh token missing from body.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          VALIDATION_ERROR: {
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Refresh token is required',
                details: ['Refresh token is required'],
              },
            },
          },
        },
      },
    },
  })
  async logout(
    @Body() dto: LogoutDto,
  ): Promise<ApiSuccessResponse<LogoutResponse>> {
    const payload = this.tokenService.tryGetRefreshTokenPayload(dto.refreshToken);

    await this.tokenService.revokeRefreshToken(dto.refreshToken);

    if (payload?.identifier) {
      await this.otpService.clearSendCooldownForIdentifier(payload.identifier);
    }

    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /v1/auth/me
  // ═══════════════════════════════════════════════════════════════════
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Current user + onboarding hints (authenticated)',
    description: `
Returns the authenticated user's **profile** and derived **onboarding** flags for
cold-start routing (e.g. name, avatar, use case, completion).

### Auth
- **Bearer access token** only (\`type: access\` from \`/otp/verify\` or \`/auth/refresh\`)

### \`onboarding\`
| Field | Meaning |
|-------|---------|
| \`hasDisplayName\` | Non-empty \`name\` in the database |
| \`hasAvatar\` | Non-null, non-empty \`avatarUrl\` |
| \`hasUseCase\` | Non-null, non-empty \`useCase\` |
| \`isOnboardingComplete\` | \`onboardingCompletedAt\` is set |

Top-level \`useCase\` and \`onboardingCompletedAt\` mirror stored profile fields.
Avatar may still be optional in product UX (client can skip); client combines this
with local state when deciding screens.
`,
  })
  @ApiOkResponse({
    description: 'Current user and onboarding hints',
    type: AuthMeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          ACCOUNT_INACTIVE: {
            value: {
              success: false,
              error: {
                code: 'ACCOUNT_INACTIVE',
                message: 'This account is inactive.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User no longer exists',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          USER_NOT_FOUND: {
            value: {
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'User not found.',
              },
            },
          },
        },
      },
    },
  })
  async getMe(
    @Req() req: Request,
  ): Promise<ApiSuccessResponse<AuthMeDataDto>> {
    const authUser = req.user as
      | { userId: string; identifier: string }
      | undefined;
    if (!authUser?.userId) {
      throw new UnauthorizedException(
        'Authentication context missing after guard.',
      );
    }

    const user = await this.userService.findById(authUser.userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    return {
      success: true,
      data: userToMeData(user),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /v1/auth/me
  // ═══════════════════════════════════════════════════════════════════
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update profile (authenticated)',
    description: `
Updates profile fields for **name**, **avatar URL**, **use case** (onboarding), and
**onboarding completion** (final step).

### Auth
- **Bearer access token** only (\`type: access\` from \`/otp/verify\` or \`/auth/refresh\`)

### Name normalization
- Unicode NFC, trim, collapse internal whitespace, strip ASCII control characters.
- Length **1–80** characters after normalization when \`name\` is sent.

### Avatar URL
- Set \`avatarUrl\` to the \`url\` from \`POST /v1/upload/avatar\` (or any validated https URL).

### Use case
- Send a supported slug in \`useCase\` (see DTO \`enum\`).

### Onboarding complete
- Send \`onboardingCompleted: true\` on the final step; server sets \`onboardingCompletedAt\` **once** (first completion; retries do not change the timestamp).
- \`false\` does not clear an existing completion.

### Body
- At least one of \`name\`, \`avatarUrl\`, \`useCase\`, or \`onboardingCompleted\` is required.

### Edge cases
| Situation | Response |
|-----------|----------|
| Token missing / wrong type / expired | \`401\` |
| User row deleted after JWT issued | \`404 USER_NOT_FOUND\` |
| \`isActive: false\` | \`403 ACCOUNT_INACTIVE\` |
| Empty / whitespace-only \`name\` after sanitize | \`400 DISPLAY_NAME_INVALID\` or validation |
| Concurrent PATCH requests | Last successful write wins |
`,
  })
  @ApiOkResponse({
    description: 'Updated user profile',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or DISPLAY_NAME_INVALID',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          VALIDATION_ERROR: {
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Name must be at least 1 character(s) after trimming',
                details: [
                  'Name must be at least 1 character(s) after trimming',
                ],
              },
            },
          },
          DISPLAY_NAME_INVALID: {
            value: {
              success: false,
              error: {
                code: 'DISPLAY_NAME_INVALID',
                message: 'Name cannot be empty or only whitespace.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          ACCOUNT_INACTIVE: {
            value: {
              success: false,
              error: {
                code: 'ACCOUNT_INACTIVE',
                message: 'This account is inactive.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User no longer exists',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          USER_NOT_FOUND: {
            value: {
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'User not found.',
              },
            },
          },
        },
      },
    },
  })
  async patchMe(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiSuccessResponse<UserProfileDataDto>> {
    const authUser = req.user as
      | { userId: string; identifier: string }
      | undefined;
    if (!authUser?.userId) {
      throw new UnauthorizedException(
        'Authentication context missing after guard.',
      );
    }

    const user = await this.userService.updateProfile(authUser.userId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      ...(dto.useCase !== undefined ? { useCase: dto.useCase } : {}),
      ...(dto.onboardingCompleted !== undefined
        ? { onboardingCompleted: dto.onboardingCompleted }
        : {}),
    });

    return {
      success: true,
      data: userToProfileData(user),
    };
  }
}
