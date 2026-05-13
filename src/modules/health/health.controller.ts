import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

interface HealthCheck {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness + readiness probe',
    description:
      'Returns 200 if the app is up. `checks.database` and `checks.redis` indicate dependency health.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      example: {
        status: 'ok',
        uptime: 12345.67,
        timestamp: '2026-04-19T11:45:00.000Z',
        checks: { database: 'up', redis: 'up' },
      },
    },
  })
  async check(): Promise<HealthCheck> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status: 'ok' | 'degraded' =
      database === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const result = await this.redis.get('__health_probe__');
      // Any response (even null) means Redis is reachable
      void result;
      return 'up';
    } catch {
      return 'down';
    }
  }
}
