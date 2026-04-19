import type { Params } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

/**
 * Logger configuration for nestjs-pino.
 *
 *   • Development → pretty, colorized, single-line
 *   • Production  → structured JSON (one object per line)
 *
 * Render / Fly / Datadog / Better Stack all natively parse JSON logs
 * into searchable fields (level, reqId, statusCode, responseTime, ...).
 */
export function buildLoggerConfig(nodeEnv: string): Params {
  const isProduction = nodeEnv === 'production';

  return {
    pinoHttp: {
      level: isProduction ? 'info' : 'debug',

      // Attach a correlation ID to every request so all logs emitted
      // during that request can be filtered together (req.id field).
      genReqId: (req: IncomingMessage) => {
        const existing = req.headers['x-request-id'];
        if (typeof existing === 'string' && existing.length > 0) {
          return existing;
        }
        return randomUUID();
      },

      // ─── Redaction ─────────────────────────────────────────────
      // Never log secrets, tokens, or OTP codes.
      // Pino redacts these paths before they hit stdout.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["idempotency-key"]',
          'req.body.password',
          'req.body.otp',
          'req.body.code',
          'req.body.refreshToken',
          'req.body.accessToken',
          'res.headers["set-cookie"]',
          '*.password',
          '*.accessToken',
          '*.refreshToken',
          '*.otp',
        ],
        censor: '[REDACTED]',
      },

      // ─── Quiet the noisy endpoints ─────────────────────────────
      // Health check logs would drown out real traffic on Render's
      // 15-min-wake pings; demote them to trace level.
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        if (_req.url?.startsWith('/v1/health')) return 'trace';
        return 'info';
      },

      // ─── Message formatting ────────────────────────────────────
      customSuccessMessage: (req, res) => {
        return `${req.method ?? 'GET'} ${req.url ?? ''} ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method ?? 'GET'} ${req.url ?? ''} ${res.statusCode} — ${err.message}`;
      },

      // ─── Transport (dev only) ──────────────────────────────────
      ...(isProduction
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,req,res,responseTime',
                messageFormat: '{msg} {if req}[{req.id}]{end}',
              },
            },
          }),
    },
  };
}
