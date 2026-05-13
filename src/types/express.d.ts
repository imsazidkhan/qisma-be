export {};

declare global {
  namespace Express {
    interface Request {
      /** Set by JwtAuthGuard after successful Bearer token verification */
      user?: {
        userId: string;
        identifier: string;
      };
    }
  }
}
