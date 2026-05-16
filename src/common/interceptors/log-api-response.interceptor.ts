import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Safety cap so a huge payload cannot allocate unbounded log strings. */
const ABS_MAX_RESPONSE_LOG_CHARS = 10 * 1024 * 1024;

function envFlagDisabled(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return (
    v === 'false' ||
    v === '0' ||
    v === 'no' ||
    v === 'off'
  );
}

function envFlagEnabled(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return (
    v === 'true' ||
    v === '1' ||
    v === 'yes' ||
    v === 'on'
  );
}

/** `production` → never. `development` → on unless explicitly disabled. Others → only if explicitly enabled. */
function shouldLogResponseBodies(): boolean {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  if (nodeEnv === 'production') {
    return false;
  }

  const raw = process.env['LOG_RESPONSE_BODY'];

  if (envFlagDisabled(raw)) {
    return false;
  }
  if (envFlagEnabled(raw)) {
    return true;
  }

  // Unset / unknown → default on in local dev only
  return nodeEnv === 'development';
}

function effectiveMaxLoggedChars(): number {
  const raw = process.env['LOG_RESPONSE_BODY_MAX_CHARS'];
  if (raw === undefined || raw === '' || raw.trim() === '') {
    return ABS_MAX_RESPONSE_LOG_CHARS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return ABS_MAX_RESPONSE_LOG_CHARS;
  }
  if (n === 0) {
    return ABS_MAX_RESPONSE_LOG_CHARS;
  }
  return Math.min(Math.floor(n), ABS_MAX_RESPONSE_LOG_CHARS);
}

/** Pretty-print JSON bodies (`indent` spaces); passes through plain strings unless they parse as JSON. */
function stringifyResponsePretty(data: unknown): string {
  try {
    if (typeof data === 'string') {
      const t = data.trim();
      const looksJson =
        (t.startsWith('{') && t.endsWith('}')) ||
        (t.startsWith('[') && t.endsWith(']'));
      if (looksJson) {
        try {
          return JSON.stringify(JSON.parse(data) as unknown, null, 2);
        } catch {
          return data;
        }
      }
      return data;
    }
    return JSON.stringify(data ?? null, null, 2);
  } catch {
    return '[unserializable response]';
  }
}

/**
 * Logs controller return values (before Nest serializes). In **`development`** this runs by default;
 * set **`LOG_RESPONSE_BODY=false`** to disable. Always off in **`production`**.
 *
 * Uses **`console.log`** with **pretty-printed JSON** (2-space indent) so the payload is readable in the terminal.
 */
@Injectable()
export class LogApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!shouldLogResponseBodies()) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      id?: string;
    }>();

    const maxChars = effectiveMaxLoggedChars();

    return next.handle().pipe(
      tap((data: unknown) => {
        const serialized = stringifyResponsePretty(data);

        const truncated = serialized.length > maxChars;
        const preview = truncated ? serialized.slice(0, maxChars) : serialized;
        const tail = truncated ? ' …[truncated]' : '';

        const idTag =
          typeof req.id === 'string' && req.id.length > 0 ? `[${req.id}] ` : '';
        const header = `${idTag}[response] ${req.method ?? 'GET'} ${req.url ?? ''}${tail}`;

        console.log(header);
        console.log(preview);
      }),
    );
  }
}
