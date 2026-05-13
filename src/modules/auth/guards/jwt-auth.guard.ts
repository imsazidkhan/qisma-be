import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { TokenService } from '../services/token.service';
import {
  UnauthorizedException,
  InvalidTokenException,
  TokenExpiredException,
  InvalidSignatureException,
  SessionRevokedException,
} from '../../../common/exceptions/api.exception';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // Check if Authorization header exists
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required.');
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new InvalidTokenException(
        'Invalid authorization header format. Use: Bearer <token>',
      );
    }

    const token = parts[1];

    if (!token) {
      throw new UnauthorizedException('Token is required.');
    }

    try {
      // Verify token (includes revocation check)
      const payload = await this.tokenService.verifyAccessToken(token);

      // Check token type
      if (payload.type !== 'access') {
        throw new InvalidTokenException(
          'Invalid token type. Access token required.',
        );
      }

      // Attach user info to request
      request.user = {
        userId: payload.sub,
        identifier: payload.identifier,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw new TokenExpiredException();
      }

      if (error instanceof JsonWebTokenError) {
        if (error.message.includes('signature')) {
          throw new InvalidSignatureException();
        }
        throw new InvalidTokenException();
      }

      // Handle revocation
      if (error instanceof Error && error.message === 'SESSION_REVOKED') {
        throw new SessionRevokedException();
      }

      // Re-throw our custom exceptions
      if (
        error instanceof UnauthorizedException ||
        error instanceof InvalidTokenException ||
        error instanceof TokenExpiredException ||
        error instanceof InvalidSignatureException ||
        error instanceof SessionRevokedException
      ) {
        throw error;
      }

      throw new InvalidTokenException();
    }
  }
}
