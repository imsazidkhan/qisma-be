import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExtraModels,
} from '@nestjs/swagger';
import { OtpService } from './otp.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import {
  SendOtpResponseDto,
  VerifyOtpResponseDto,
} from './dto/otp-responses.dto.js';
import { ApiErrorDto } from '../../common/dto/api-response.dto.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import {
  IdempotencyKeyRequiredException,
  IdempotencyKeyInvalidException,
} from '../../common/exceptions/api.exception.js';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface.js';
import type { VerifyOtpData } from './otp.service.js';

@ApiTags('OTP')
@ApiExtraModels(ApiErrorDto)
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // POST /v1/otp/send
  // ═══════════════════════════════════════════════════════════════════
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send OTP to phone number',
    description: `
Generates a cryptographically secure 6-digit OTP and stores the session in Redis.

### Rate Limiting (in order)
1. **IP rate limit** — 20 requests / 60s per IP  
2. **Cooldown** — 60s between requests for the same phone  
3. **Phone rate limit** — 5 requests / 60s per phone

### Security
- OTP generated via \`crypto.randomInt()\` (cryptographically secure)
- OTP itself never returned in response
- Any previous active session for the same phone is invalidated
- Session is single-use and expires in 5 minutes
`,
  })
  // ─── SUCCESS ───────────────────────────────────────────────────
  @ApiResponse({
    status: 201,
    description: 'OTP generated and (in production) sent via SMS.',
    type: SendOtpResponseDto,
  })
  // ─── 400 Bad Request ───────────────────────────────────────────
  @ApiResponse({
    status: 400,
    description: 'Validation error — phone number format is invalid.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          INVALID_PHONE: {
            summary: 'Invalid phone format',
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message:
                  'Phone number must be a valid international format',
                details: [
                  'Phone number must be a valid international format',
                ],
              },
            },
          },
          MISSING_PHONE: {
            summary: 'Missing phone field',
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'phone should not be empty',
                details: ['phone should not be empty'],
              },
            },
          },
        },
      },
    },
  })
  // ─── 429 Too Many Requests ─────────────────────────────────────
  @ApiResponse({
    status: 429,
    description:
      'Rate limited — cooldown, per-phone, or per-IP quota exceeded.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          COOLDOWN_ACTIVE: {
            summary: 'Cooldown active (same phone, too soon)',
            value: {
              success: false,
              error: {
                code: 'COOLDOWN_ACTIVE',
                message:
                  'Please wait 45 seconds before requesting a new OTP.',
                retryAfter: 45,
              },
            },
          },
          RATE_LIMITED_PHONE: {
            summary: 'Phone rate limit hit (5 requests / min)',
            value: {
              success: false,
              error: {
                code: 'RATE_LIMITED_PHONE',
                message:
                  'Too many OTP requests for this phone. Try again after 30 seconds.',
                retryAfter: 30,
              },
            },
          },
          RATE_LIMITED_IP: {
            summary: 'IP rate limit hit (distributed spam)',
            value: {
              success: false,
              error: {
                code: 'RATE_LIMITED_IP',
                message:
                  'Too many requests from this IP. Try again after 50 seconds.',
                retryAfter: 50,
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
    description: 'Redis unavailable or unexpected server error.',
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
  async sendOtp(@Body() dto: SendOtpDto, @Ip() clientIp: string) {
    return this.otpService.sendOtp(dto.phone, clientIp);
  }

  // ═══════════════════════════════════════════════════════════════════
  // POST /v1/otp/verify
  // ═══════════════════════════════════════════════════════════════════
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and receive JWT tokens',
    description: `
Atomically verifies a 6-digit OTP against the stored session.

### Atomicity (Lua script)
- Session fetch, state check, attempt increment, OTP compare, and status update all happen in a **single Redis transaction**
- Under parallel requests, only ONE can successfully verify; others get \`ALREADY_VERIFIED\` or \`MAX_ATTEMPTS\`

### Idempotency
- **Requires** \`Idempotency-Key\` header (max 64 chars)
- Successful responses are cached for 5–10 minutes under that key
- Retrying with the same key returns the cached token pair (no new tokens issued)
- Parallel requests with the same key → one processes, others get \`IDEMPOTENCY_CONFLICT\`

### Security
- Max 5 wrong OTP attempts → session locked for 5 minutes
- Verify rate limit: 10 requests / min per session
- On success → phone marked verified, \`lastLoginAt\` updated, user row upserted
`,
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique key per verify attempt (max 64 chars). Generate a UUID or nanoid on the client.',
    required: true,
    example: 'verify-550e8400-e29b-41d4-a716-446655440000',
  })
  // ─── SUCCESS ───────────────────────────────────────────────────
  @ApiResponse({
    status: 200,
    description:
      'OTP verified. Access + refresh token pair issued. User row upserted with phoneVerified=true.',
    type: VerifyOtpResponseDto,
  })
  // ─── 400 Bad Request ───────────────────────────────────────────
  @ApiResponse({
    status: 400,
    description:
      'Validation error, wrong OTP, or idempotency-key missing/invalid.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          INVALID_OTP: {
            summary: 'OTP does not match',
            value: {
              success: false,
              error: {
                code: 'INVALID_OTP',
                message: 'The OTP entered is incorrect',
              },
            },
          },
          IDEMPOTENCY_KEY_REQUIRED: {
            summary: 'Idempotency-Key header missing',
            value: {
              success: false,
              error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message:
                  'Idempotency-Key header is required for this request.',
              },
            },
          },
          IDEMPOTENCY_KEY_INVALID: {
            summary: 'Idempotency-Key malformed',
            value: {
              success: false,
              error: {
                code: 'IDEMPOTENCY_KEY_INVALID',
                message:
                  'Idempotency-Key must be a valid UUID or non-empty string (max 64 chars).',
              },
            },
          },
          VALIDATION_ERROR: {
            summary: 'Invalid sessionId or otp format',
            value: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'OTP must be exactly 6 digits',
                details: ['OTP must be exactly 6 digits'],
              },
            },
          },
        },
      },
    },
  })
  // ─── 404 Not Found ─────────────────────────────────────────────
  @ApiResponse({
    status: 404,
    description:
      'Session does not exist (never created, expired, or already consumed).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          SESSION_NOT_FOUND: {
            value: {
              success: false,
              error: {
                code: 'SESSION_NOT_FOUND',
                message: 'OTP session not found or expired',
              },
            },
          },
        },
      },
    },
  })
  // ─── 409 Conflict ──────────────────────────────────────────────
  @ApiResponse({
    status: 409,
    description: 'Another request with the same Idempotency-Key is in-flight.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          IDEMPOTENCY_CONFLICT: {
            value: {
              success: false,
              error: {
                code: 'IDEMPOTENCY_CONFLICT',
                message:
                  'A request with this Idempotency-Key is already being processed.',
              },
            },
          },
        },
      },
    },
  })
  // ─── 410 Gone ──────────────────────────────────────────────────
  @ApiResponse({
    status: 410,
    description: 'Session exists but the OTP has expired (5 min TTL).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          OTP_EXPIRED: {
            value: {
              success: false,
              error: {
                code: 'OTP_EXPIRED',
                message: 'OTP has expired',
              },
            },
          },
        },
      },
    },
  })
  // ─── 423 Locked ────────────────────────────────────────────────
  @ApiResponse({
    status: 423,
    description:
      'Session locked — too many failed attempts. Includes `retryAfter` seconds.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          SESSION_LOCKED: {
            value: {
              success: false,
              error: {
                code: 'SESSION_LOCKED',
                message: 'Session is locked. Try again after 240 seconds.',
                retryAfter: 240,
              },
            },
          },
        },
      },
    },
  })
  // ─── 429 Too Many Requests ─────────────────────────────────────
  @ApiResponse({
    status: 429,
    description:
      'Verify rate limit hit, or max OTP attempts reached (session locked).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          VERIFY_RATE_LIMITED: {
            summary: 'Too many verify attempts (10/min per session)',
            value: {
              success: false,
              error: {
                code: 'VERIFY_RATE_LIMITED',
                message:
                  'Too many verification attempts. Try again after 45 seconds.',
                retryAfter: 45,
              },
            },
          },
          MAX_ATTEMPTS: {
            summary: 'Hit 5 wrong attempts — session locked',
            value: {
              success: false,
              error: {
                code: 'MAX_ATTEMPTS',
                message:
                  'Maximum OTP attempts reached. Please request a new OTP.',
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
    description: 'Redis unavailable, token generation failed, or DB unreachable.',
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
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ApiSuccessResponse<VerifyOtpData>> {
    if (!idempotencyKey) {
      throw new IdempotencyKeyRequiredException();
    }

    if (!this.idempotencyService.isValidKey(idempotencyKey)) {
      throw new IdempotencyKeyInvalidException();
    }

    const { cached, response } =
      await this.idempotencyService.getOrLock<
        ApiSuccessResponse<VerifyOtpData>
      >(idempotencyKey);

    if (cached && response) {
      return response;
    }

    try {
      const result = await this.otpService.verifyOtp(dto.sessionId, dto.otp);
      await this.idempotencyService.complete(idempotencyKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.release(idempotencyKey);
      throw error;
    }
  }
}
