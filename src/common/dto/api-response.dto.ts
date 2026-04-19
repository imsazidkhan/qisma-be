import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error envelope returned by every failed request.
 * All errors follow this shape for predictable frontend handling.
 */
export class ApiErrorDto {
  @ApiProperty({
    description: 'Always `false` for error responses',
    example: false,
  })
  success!: false;

  @ApiProperty({
    type: 'object',
    description: 'Error payload',
    properties: {
      code: {
        type: 'string',
        description: 'Machine-readable error code (e.g. RATE_LIMITED_PHONE)',
        example: 'RATE_LIMITED_PHONE',
      },
      message: {
        type: 'string',
        description: 'Human-readable error message',
        example:
          'Too many OTP requests for this phone. Try again after 45 seconds.',
      },
      retryAfter: {
        type: 'number',
        description: 'Seconds to wait before retrying (only on rate/cooldown errors)',
        example: 45,
        nullable: true,
      },
      details: {
        type: 'array',
        items: { type: 'string' },
        description: 'Validation error details (only on VALIDATION_ERROR)',
        nullable: true,
      },
    },
    required: ['code', 'message'],
  })
  error!: {
    code: string;
    message: string;
    retryAfter?: number;
    details?: string[];
  };
}

/**
 * Generic success envelope. Use with `type` generic when referencing in docs.
 */
export class ApiSuccessDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ description: 'Response payload' })
  data!: T;
}
