import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { RateLimitService } from './services/rate-limit.service';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [GroupsModule],
  controllers: [OtpController],
  providers: [OtpService, RateLimitService],
  exports: [OtpService],
})
export class OtpModule {}
