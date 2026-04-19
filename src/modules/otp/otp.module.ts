import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller.js';
import { OtpService } from './otp.service.js';
import { RateLimitService } from './services/rate-limit.service.js';

@Module({
  controllers: [OtpController],
  providers: [OtpService, RateLimitService],
  exports: [OtpService],
})
export class OtpModule {}
