import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { IdempotencyService } from './services/idempotency.service.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

@Global()
@Module({
  providers: [
    IdempotencyService,
    // Register globally via DI so it can inject PinoLogger.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [IdempotencyService],
})
export class CommonModule {}
