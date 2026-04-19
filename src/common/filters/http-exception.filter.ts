import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface ValidationErrorResponse {
  message: string[];
  error: string;
  statusCode: number;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Log unexpected 5xx with full stack. 4xx are client errors → info only.
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          method: request.method,
          url: request.url,
          statusCode: status,
        },
        `Unhandled ${status} on ${request.method} ${request.url}`,
      );
    }

    if (
      typeof exceptionResponse === 'object' &&
      'success' in exceptionResponse
    ) {
      response.status(status).json(exceptionResponse);
      return;
    }

    if (this.isValidationError(exceptionResponse)) {
      const messages = exceptionResponse.message;
      response.status(status).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: Array.isArray(messages) ? messages[0] : messages,
          details: Array.isArray(messages) ? messages : [messages],
        },
      });
      return;
    }

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string }).message ??
          'An error occurred');

    response.status(status).json({
      success: false,
      error: {
        code: this.getErrorCode(status),
        message,
      },
    });
  }

  private isValidationError(
    response: unknown,
  ): response is ValidationErrorResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      'statusCode' in response &&
      (response as ValidationErrorResponse).statusCode ===
        (HttpStatus.BAD_REQUEST as number)
    );
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      410: 'GONE',
      423: 'LOCKED',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] ?? 'UNKNOWN_ERROR';
  }
}
