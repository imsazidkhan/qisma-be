import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TokenService } from './services/token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { OtpModule } from '../otp/otp.module';
import { GroupsModule } from '../groups/groups.module';
import { GroupsController } from '../groups/groups.controller';

@Global()
@Module({
  imports: [
    GroupsModule,
    OtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController, GroupsController],
  providers: [TokenService, JwtAuthGuard, RefreshTokenRepository],
  exports: [TokenService, JwtAuthGuard, JwtModule, RefreshTokenRepository],
})
export class AuthModule {}
