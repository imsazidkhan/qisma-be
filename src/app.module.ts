import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { OtpModule } from './modules/otp/otp.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { validateEnv } from './config/env.schema.js';
import { buildLoggerConfig } from './config/logger.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      cache: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildLoggerConfig(config.get<string>('NODE_ENV') ?? 'development'),
    }),
    CommonModule,
    DatabaseModule,
    RedisModule,
    UserModule,
    AuthModule,
    OtpModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
