/**
 * User fields safe to expose from APIs (no tokens or internal-only relations).
 */
export interface PublicUser {
  id: string;
  identifier: string;
  /** Set via PATCH /auth/me; null until onboarding collects a name. */
  name: string | null;
  /** Avatar URL after POST /upload/avatar and PATCH /auth/me; null until set. */
  avatarUrl: string | null;
  /** Use-case slug from onboarding; null until PATCH /auth/me. */
  useCase: string | null;
  /** Server-set when client sends onboardingCompleted: true; null until then. */
  onboardingCompletedAt: Date | null;
  phoneVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}
