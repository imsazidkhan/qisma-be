import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Route all Nest logs through pino (structured JSON in production,
  // pretty colorized in dev). Must be called before app.listen().
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Graceful shutdown:
  // On SIGTERM (Render/Fly/K8s pod stop) or SIGINT (Ctrl+C), Nest will:
  //   1. Stop accepting new HTTP connections
  //   2. Wait for in-flight requests to finish
  //   3. Call OnModuleDestroy on every provider (Prisma.$disconnect, Redis.quit, ...)
  //   4. Exit cleanly
  app.enableShutdownHooks();

  // All API routes live under /v1 (versioning).
  // Exclude the root welcome route so GET / keeps working.
  app.setGlobalPrefix('v1', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // HttpExceptionFilter is registered globally via APP_FILTER in CommonModule
  // so it can inject PinoLogger via DI.

  // ─── Swagger / OpenAPI ───────────────────────────────────────────
  const swaggerDescription = `
OTP-based authentication service with production-grade JWT rotation,
multi-layer rate limiting, idempotency, and audit trails.

## Authentication Flow

1. \`POST /v1/otp/send\` — client submits phone → receives \`sessionId\`
2. (User enters 6-digit code delivered via SMS)
3. \`POST /v1/otp/verify\` — client submits \`sessionId\` + OTP + \`Idempotency-Key\` header → receives access + refresh tokens
4. Use \`Authorization: Bearer <accessToken>\` on protected endpoints
5. When access token expires → \`POST /v1/auth/refresh\` with refresh token → receives **new** pair (old refresh is invalidated)
6. \`POST /v1/auth/logout\` revokes the refresh token

## Response Envelope

**Success:**
\`\`\`json
{ "success": true, "data": { ... } }
\`\`\`

**Error:**
\`\`\`json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable message",
    "retryAfter": 60
  }
}
\`\`\`

\`retryAfter\` (seconds) is present on all rate-limit / cooldown / lock errors.

## Security Features

- **Cryptographically secure OTPs** (\`crypto.randomInt\`)
- **Atomic Redis Lua scripts** for rate limiting & OTP verification (race-safe under parallel requests)
- **JWT refresh token rotation** — single-use, persisted to Postgres with SHA-256 hash
- **Reuse detection** — using a rotated refresh token twice revokes the entire token family + all user sessions
- **Clock skew tolerance** (5s)
- **Idempotency keys** prevent double-processing on retries
- **Three-layer rate limiting** (IP → cooldown → phone)

## Error Code Reference

| Code | Status | Meaning |
|---|---|---|
| \`VALIDATION_ERROR\` | 400 | Request body failed DTO validation |
| \`INVALID_OTP\` | 400 | Wrong OTP code entered |
| \`IDEMPOTENCY_KEY_REQUIRED\` | 400 | Missing \`Idempotency-Key\` header |
| \`IDEMPOTENCY_KEY_INVALID\` | 400 | Malformed key (>64 chars or empty) |
| \`UNAUTHORIZED\` | 401 | No / malformed Authorization header |
| \`INVALID_TOKEN\` | 401 | Token malformed |
| \`TOKEN_EXPIRED\` | 401 | Access token expired |
| \`INVALID_SIGNATURE\` | 401 | Token tampered / wrong secret |
| \`REFRESH_TOKEN_INVALID\` | 401 | Refresh token not found / revoked |
| \`REFRESH_TOKEN_EXPIRED\` | 401 | Refresh token past expiry |
| \`TOKEN_REUSED\` | 401 | Replay attack — sessions revoked |
| \`SESSION_REVOKED\` | 401 | User forced logout |
| \`SESSION_NOT_FOUND\` | 404 | OTP session never created or expired |
| \`IDEMPOTENCY_CONFLICT\` | 409 | Parallel request with same key in-flight |
| \`OTP_EXPIRED\` | 410 | OTP session expired (5 min TTL) |
| \`SESSION_LOCKED\` | 423 | Too many failed attempts |
| \`COOLDOWN_ACTIVE\` | 429 | 60s cooldown between sends |
| \`RATE_LIMITED_IP\` | 429 | IP quota exceeded |
| \`RATE_LIMITED_PHONE\` | 429 | Phone quota exceeded |
| \`VERIFY_RATE_LIMITED\` | 429 | Verify quota exceeded |
| \`MAX_ATTEMPTS\` | 429 | Hit 5 wrong OTPs |
| \`INTERNAL_ERROR\` | 500 | Infrastructure failure |
`;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Veloraq Auth Service')
    .setDescription(swaggerDescription)
    .setVersion('1.0')
    .setContact('Veloraq', 'https://veloraq.com', 'support@veloraq.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('https://api.veloraq.co', 'Production')
    .addServer('http://localhost:3000', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from /v1/otp/verify or /v1/auth/refresh',
      },
      'access-token',
    )
    .addTag('OTP', 'Send & verify one-time passwords')
    .addTag('Auth', 'Token refresh, logout, session management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Veloraq Auth — API Docs',
  });
  // ─────────────────────────────────────────────────────────────────

  const port = process.env['PORT'] ?? 3000;
  // Bind to 0.0.0.0 so the port is reachable from outside the container
  // (required by Render, Fly, Railway, Docker, etc.).
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs: http://localhost:${port}/docs`, 'Bootstrap');
  logger.log(`Health check: http://localhost:${port}/v1/health`, 'Bootstrap');

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      logger.log(
        `Received ${signal} — starting graceful shutdown...`,
        'Bootstrap',
      );
    });
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to bootstrap application:', err);
  process.exit(1);
});
