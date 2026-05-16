import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from './infrastructure/redis/redis.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { OtpModule } from './modules/otp/otp.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { UploadModule } from './modules/upload/upload.module';
import { validateEnv } from './config/env.schema';
import { buildLoggerConfig } from './config/logger.config';
import { RootController } from './modules/root/root.controller';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SplitsModule } from './modules/splits/splits.module';
import { LogApiResponseInterceptor } from './common/interceptors/log-api-response.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 200,
      },
    ]),
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
    UploadModule,
    ContactsModule,
    ScheduleModule.forRoot(),
    AnalyticsModule,
    SplitsModule,
    ExpensesModule,
  ],
  controllers: [RootController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogApiResponseInterceptor,
    },
  ],
})
export class AppModule {}
