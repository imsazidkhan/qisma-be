import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TokenService } from './services/token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [TokenService, JwtAuthGuard, RefreshTokenRepository],
  exports: [TokenService, JwtAuthGuard, JwtModule, RefreshTokenRepository],
})
export class AuthModule {}
