import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { TokenService } from './services/token.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import {
  RefreshTokenResponseDto,
  LogoutResponseDto,
} from './dto/auth-responses.dto.js';
import { ApiErrorDto } from '../../common/dto/api-response.dto.js';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface.js';
import {
  RefreshTokenInvalidException,
  RefreshTokenExpiredException,
  InvalidSignatureException,
  TokenReusedException,
  InternalErrorException,
} from '../../common/exceptions/api.exception.js';

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LogoutResponse {
  message: string;
}

@ApiTags('Auth')
@ApiExtraModels(ApiErrorDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

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
    description: 'Token is invalid, expired, reused, or the session is revoked.',
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
    await this.tokenService.revokeRefreshToken(dto.refreshToken);

    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }
}
