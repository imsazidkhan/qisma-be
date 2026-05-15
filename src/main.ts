import { join } from 'node:path';

import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const avatarsStatic = join(process.cwd(), 'uploads', 'avatars');
  app.useStaticAssets(avatarsStatic, { prefix: '/v1/uploads/avatars/' });

  const receiptsStatic = join(process.cwd(), 'uploads', 'receipts');
  app.useStaticAssets(receiptsStatic, { prefix: '/v1/uploads/receipts/' });

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

  const bootstrapConfig = app.get(ConfigService);
  if (bootstrapConfig.get<string>('TRUST_PROXY') === 'true') {
    app.set('trust proxy', 1);
  }

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

  const configService = bootstrapConfig;
  const corsRaw = configService.get<string>('CORS_ORIGINS');
  const corsOrigins = corsRaw
    ?.split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  // Flux mobile/web client sends X-App-* on every request → browsers preflight OPTIONS;
  // these headers must be listed or CORS fails (e.g. Expo Web on http://localhost:8081).
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Idempotency-Key',
      'X-App-Version',
      'X-App-Platform',
      'X-Device-Id',
    ],
    credentials: false,
    maxAge: 86_400,
  });

  // HttpExceptionFilter is registered globally via APP_FILTER in CommonModule
  // so it can inject PinoLogger via DI.

  // ─── Swagger / OpenAPI ───────────────────────────────────────────
  const swaggerDescription = `
OTP-based authentication service with production-grade JWT rotation,
multi-layer rate limiting, idempotency, and audit trails.

## Endpoint Map

| Method | Path | Auth | Purpose |
|---|---|---|---|
| \`GET\` | \`/v1/health\` | — | Liveness + dependency readiness probe |
| \`POST\` | \`/v1/otp/send\` | — | Generate + dispatch a 6-digit OTP for a phone |
| \`POST\` | \`/v1/otp/verify\` | — | Exchange OTP for JWTs **+ materialize \`group_invites\` → \`group_members\` \`pending\`** (same accept/decline as registered invites) |
| \`POST\` | \`/v1/auth/refresh\` | — | Rotate refresh token → new access + refresh pair |
| \`POST\` | \`/v1/auth/logout\` | — | Revoke a refresh token (idempotent) |
| \`GET\` | \`/v1/auth/me\` | Bearer | Current user profile + onboarding hints |
| \`PATCH\` | \`/v1/auth/me\` | Bearer | Update name / avatar / use-case / completion |
| \`POST\` | \`/v1/upload/avatar\` | Bearer | Multipart upload → public URL for \`avatarUrl\` |
| \`POST\` | \`/v1/contacts/sync\` | Bearer | Sync phones (**E.164**); **registered[]** = minimal user (**id**, **name**, **username**, **avatar** only); **unregistered** = no active user |
| \`GET\` | \`/v1/users/me/group-invites\` | Bearer | **Inbox:** pending \`group_members\` (**registered invites + offline-phone invites after OTP verify**); accept/decline \`groupId\` sources |
| \`GET\` | \`/v1/users/me/groups\` | Bearer | **Home:** **active** memberships + slim **group** + **\`isCreator\`**; **newest \`joinedAt\` first** |
| \`GET\` | \`/v1/users/me/groups/home\` | Bearer | **Home cards** — viewer balance (**minor**), member/expense counts, last **\`activity_logs\`**; query **\`tab\`** **all** / **owe** / **get_back** / **settled** |
| \`GET\` | \`/v1/users/search?q=\` | Bearer | User directory: unified \`q\` (phone + username prefix + name) |
| \`GET\` | \`/v1/groups\` | Bearer | List groups created by the current user |
| \`GET\` | \`/v1/groups/{groupId}\` | Bearer | Single group detail (creator only); see **Groups** below |
| \`GET\` | \`/v1/groups/{groupId}/member-profile\` | Bearer | Same **\`GroupDataDto\`** as creator detail — **active** members only; see **Groups** below |
| \`GET\` | \`/v1/groups/{groupId}/members\` | Bearer | Group roster (**active member**, any role); see **Groups** below |
| \`GET\` | \`/v1/groups/{groupId}/activity\` | Bearer | Activity feed (**\`member_joined\`**, **\`invite_sent\`**, **\`invite_accepted\`**); active member |
| \`GET\` | \`/v1/groups/{groupId}/invite-preview\` | Bearer | Minimal preview (**pending invitee**): **id**, **name**, **type**, **avatar**, **memberCount** (active only); no roster |
| \`DELETE\` | \`/v1/groups/{groupId}/members/{memberId}\` | Bearer | Remove member (**owner**/**admin** only); **\`200\`** roster; see **Groups** below |
| \`DELETE\` | \`/v1/groups/{groupId}\` | Bearer | Delete group (**owner** only); see **Groups** below |
| \`POST\` | \`/v1/groups/{groupId}/members\` | Bearer | **Invite** (**\`pending\`** row); roster in response (**\`status\`**); admin or owner |
| \`POST\` | \`/v1/groups/{groupId}/invites/accept\` | Bearer | Invitee: **pending → active**; **\`200\`** roster (idempotent) |
| \`POST\` | \`/v1/groups/{groupId}/invites/decline\` | Bearer | Invitee: remove **\`pending\`** row; **\`200\`** \`data.groupId\` |
| \`PATCH\` | \`/v1/groups/{groupId}/members/{memberId}/role\` | Bearer | **Owner only:** promote \`member\`→\`admin\` / demote \`admin\`→\`member\`; **\`200\`** roster |
| \`POST\` | \`/v1/groups\` | Bearer | Create a user-owned group (see **Groups** below) |
| \`POST\` | \`/v1/groups/{groupId}/expenses\` | Bearer | Create expense — split engine, **\`expense_participants\`**, **\`activity_logs\`**, **group balance snapshot**; category/subcategory from **\`title\`** (body omits **\`categoryId\`** / **\`subcategoryId\`**); active member |
| \`GET\` | \`/v1/groups/{groupId}/expenses\` | Bearer | Expense feed — **sort** (**created_at** default, **expense_date**) + **cursor**, filters (**q**, …) |
| \`GET\` | \`/v1/groups/{groupId}/balances\` | Bearer | Balance **view** — **\`summary\`** (headline net for **you**) + **\`balances[]\`** (edges you’re in + peer snippets) + **\`updatedAt\`** — **active member** |
| \`GET\` | \`/v1/groups/{groupId}/expenses/{expenseId}\` | Bearer | Expense detail — **participants**, **comments** (**latest 50** preview, chronological; full list → **GET …/comments**), **reactions**, **attachments**, **activity_logs** (soft-deleted expense → **404**) |
| \`GET\` | \`/v1/groups/{groupId}/expenses/{expenseId}/comments\` | Bearer | **List comments** — query **sort**: **asc** (default, oldest first, cursor loads newer) or **desc** (newest first, cursor loads older); **ExpenseCommentPageDto**; cursor base64url payload **v:1, c, i, p, s** (legacy omit **s** ⇒ asc only); active member |
| \`POST\` | \`/v1/groups/{groupId}/expenses/{expenseId}/comments\` | Bearer | **Create comment** — optional **\`parentCommentId\`** (reply depth ≤ 1); **\`201\`** **\`ExpenseCommentEntryDto\`**; **\`activity_logs\`** (**\`expense_comment_created\`**) |
| \`POST\` | \`/v1/groups/{groupId}/expenses/{expenseId}/reclassify\` | Bearer | Reclassify (**\`categorySlug\`** / **\`subcategorySlug\`**) — **\`activity_logs\`**, taxonomy learning; active member (**404** if **groupId** does not own expense) |
| \`POST\` | \`/v1/groups/{groupId}/expenses/{expenseId}/reactions\` | Bearer | Add emoji reaction — **\`expense_reactions\`**, **\`activity_logs\`** (**\`expense_reaction_created\`**); **201** new / **200** idempotent; active member |
| \`POST\` | \`/v1/groups/{groupId}/expenses/{expenseId}/receipts\` | Bearer | Upload receipt (**multipart** **\`file\`**) — **\`RECEIPT_STORAGE\`** **local** or **S3/R2** ; **\`expense_attachments\`**, **\`activity_logs\`** (**\`expense_receipt_uploaded\`**) |
| \`PATCH\` | \`/v1/groups/{groupId}/expenses/{expenseId}\` | Bearer | Update expense — optional **\`expectedUpdatedAt\`** (**409** if stale); recompute splits, participants, balances (**\`split\`** required if **amount**/**paidBy** change) |
| \`DELETE\` | \`/v1/groups/{groupId}/expenses/{expenseId}\` | Bearer | Soft-delete expense (**\`deletedAt\`**) — **\`activity_logs\`**, recomputed group balance snapshot (active member) |

## Users (joined groups home **+** directory search **+** pending invites inbox)

**\`GET /v1/users/me/group-invites\`:** **Bearer** JSON — **pending** **\`group_members\`** (**registered-target invites plus rows materialized from \`group_invites\` at first OTP verify**). **\`\`PendingGroupInviteEntryDto[]\`\`:** **\`groupId\`**, **\`groupName\`**, **\`groupAvatar\`**, **\`groupType\`**, **\`role\`**, **\`invitedAt\`**, **\`invitedBy\`** (**\`addedBy\`** user snippet, or **\`null\`**). Sorted **newest \`createdAt\` first**; **\`[]\`** when none. **Raw \`group_invites\`** table rows **before** signup are **not** listed (**no JWT**). **\`403 ACCOUNT_INACTIVE\`**, **\`404 USER_NOT_FOUND\`**.

**\`GET /v1/users/me/groups\`:** **Bearer** JSON — **\`active\`** **\`group_members\`** only (joined groups **home** screen). **\`\`MyGroupRowDto[]\`\`:** **\`groupId\`**, nested **\`group\`** (**\`id\`**, **\`name\`**, **\`type\`**, **\`avatar\`**), **\`role\`**, **\`joinedAt\`**, **\`isCreator\`**. Sorted **newest \`joinedAt\` first**. **\`[]\`** if you belong to no groups yet. **Not** the same as **\`GET /v1/groups\`** (creator-only list).

**\`GET /v1/users/me/groups/home\`:** **Bearer** JSON — **\`MyGroupsHomePageDto\`**: **\`tab\`** echo (**\`all\`**, **\`owe\`**, **\`get_back\`**, **\`settled\`**) + **\`items[]\`** enriched cards (**\`balanceNetMinor\`**, **\`balanceBucket\`**, **\`memberCount\`**, **\`expenseCount\`**, **\`recentExpenseTitle\`**, **\`lastActivity*\`**, **\`pendingSettlementCount\`**). Filters server-side by viewer net vs zero (same basis as **\`GET /v1/groups/{groupId}/balances\`**). **\`400 VALIDATION_ERROR\`** bad **\`tab\`**; **\`403 ACCOUNT_INACTIVE\`**, **\`404 USER_NOT_FOUND\`**.

**\`GET /v1/users/search?q=\`:** **Bearer** JSON. **\`q\`** (**2–96** chars) is matched as **OR**: full **E.164-style** number → exact **\`User.identifier\`**; leading \`[a-z0-9_]\` (after optional \`@\`) → **username prefix** if length ≥ **2**; plus **always** case-insensitive **contains** on **\`User.name\`** (non-null names). **≤20** hits, ordered **name** then **id**. Success **\`200\`:** **\`\`UserSearchHitDto[]\`\`** (**\`id\`**, **\`name\`**, **\`username\`**, **\`avatar\`**) — **never** echoes raw phone; **caller excluded**; **inactive** omitted. **\`400\`** if \`q\` invalid / length violations.

## Contacts (device phone sync)

**\`POST /v1/contacts/sync\`:** **Bearer** JSON body with **contacts** array of phones (max **5000**). Each entry parses to valid **E.164** (\`libphonenumber-js\`; digits aligned with **\`User.identifier\`**). Default region from your verified phone → **\`CONTACT_SYNC_DEFAULT_COUNTRY\`** → **US**. **\`400 INVALID_CONTACT_PHONE\`** on bad rows. Empty **contacts** clears snapshot. **data.registered**: array of users with **id**, **name**, **username**, **avatar** only — no other fields (**identifier IN** upload, excluding **you**, **shared-group active members**, and **pending invitations** where **you are active**). **data.unregistered**: normalized upload phones with **no** active **User**. Success **200** returns **syncedCount** + **registered** + **unregistered**. Redis limits **120**/hr (**IP**) + **36**/hr (**user**).

## Groups (list / detail / roster / invites / patch role / remove member / delete group / create)

**\`GET /v1/groups\`:** Returns \`{ "success": true, "data": [ ... ] }\` — groups **you created**, newest first; \`data\` is an empty array when none exist.

**\`GET /v1/groups/{groupId}\`:** Returns \`{ "success": true, "data": { ... } }\` for one group when **you are the creator**. Otherwise \`404\` with \`GROUP_NOT_FOUND\` (including wrong id or another user’s group).

**\`GET /v1/groups/{groupId}/member-profile\`:** Same \`GroupDataDto\` shape as the route above, but for **any user with an \`active\` \`group_members\` row** (invitees who joined, admins, etc.). **\`403 NOT_GROUP_MEMBER\`** if you are not **active** in that group. **\`404 GROUP_NOT_FOUND\`** for a bad id.

**\`GET /v1/groups/{groupId}/members\`:** Roster (**\`GroupMemberRosterEntryDto[]\`**) includes **\`status\`** (\`active\` or **\`pending\`**) plus user fields and **\`joinedAt\`** (\`null\` until invite accepted). Sorted owner / admin / member. Caller must already be **\`active\`** (**\`403 NOT_GROUP_MEMBER\`** if bearer only has a **\`pending\`** invite to this group; **split/billing UIs**: filter **\`status === active\`** when needed).

**\`GET /v1/groups/{groupId}/activity\`:** (**BE Task 15**) **\`group_activity_events\`** feed (**\`invite_sent\`**, **\`invite_accepted\`**, **\`member_joined\`**) newest first (**≤100**), with **actor** / **subject** user snippets. **Active** member only (**\`403 NOT_GROUP_MEMBER\`** if pending). **\`404 GROUP_NOT_FOUND\`** invalid id.

**\`GET /v1/groups/{groupId}/invite-preview\`:** **Pending invitee only** (**\`group_members\` \`status\` pending**). Success **\`200\`:** **\`\`GroupInvitePreviewDataDto\`\`** — **\`id\`**, **\`name\`**, **\`type\`**, **\`avatar\`**, **\`memberCount\`** (active members only — excludes pending rows). No roster / timestamps / **\`createdBy\`**. **\`403 GROUP_INVITE_PREVIEW_NOT_PENDING\`** once already **active**. **\`404 GROUP_MEMBER_NOT_FOUND\`** if you have no row for this group.

**\`PATCH /v1/groups/{groupId}/members/{memberId}/role\`:** JSON body with **\`role\`**: either **admin** or **member**. **Promote:** \`role: "admin"\` (typically **member** → **admin**). **Demote:** \`role: "member"\` (**admin** → **member**). **Only the active owner** may call (**\`403 GROUP_OWNER_REQUIRED\`** otherwise). **Owner** membership row cannot be changed (**\`403 GROUP_OWNER_PROTECTED\`**). Success **\`200\`:** roster **\`\`GroupMemberRosterEntryDto[]\`\`**.

**\`DELETE /v1/groups/{groupId}/members/{memberId}\`:** **Rules:** (**1**) **Only active \`owner\`** or **\`admin\`** may call (**\`403 GROUP_ADMIN_REQUIRED\`** or **\`NOT_GROUP_MEMBER\`**). (**2**) **Cannot remove owner** (**\`403 GROUP_OWNER_PROTECTED\`**). (**3**) **No row for** \`memberId\` → **\`404 GROUP_MEMBER_NOT_FOUND\`**. (**Extra**) **Owner** removes **admin**/**member** OK; **admin** removes another **admin** forbidden (**\`403 ADMIN_REMOVE_REQUIRES_OWNER\`**), but **admin** may remove **self**. **Success \`200\`:** **\`\`GroupMemberRosterEntryDto[]\`\`** (remaining roster).

**\`DELETE /v1/groups/{groupId}\`:** Removes the group only when the caller has an active **owner** membership in table \`group_members\`. **\`200\`** with **\`data.deletedGroupId\`**. **\`403\`** (\`NOT_GROUP_MEMBER\`, \`GROUP_OWNER_REQUIRED\`) or **\`404\` \`GROUP_NOT_FOUND\`**.

**\`POST /v1/groups/{groupId}/members\`:** **Registered** user (or \`username\` / \`userId\`) → **\`group_members\` \`pending\`**; clears matching **\`group_invites\`** for that phone. **Unregistered** \`identifier\` → **\`group_invites\`** (\`pending\`, **\`expiresAt\`** ~14 days). **OTP verify** (**first login**) turns each **non-expired** matching **\`group_invites\`** row into **\`group_members\` \`pending\`** with **\`joinedAt\`** \`null\` — inbox: **\`GET /v1/users/me/group-invites\`**. **\`201\`** roster.

**\`POST /v1/groups/{groupId}/invites/accept\`:** For **pending \`group_members\`** (**registered-target** or materialized **\`group_invites\` at OTP**). Bearer user must match the invitee. Sets **active** + **\`joinedAt\`**. Idempotent if already active.

**\`POST /v1/groups/{groupId}/invites/decline\`:** Deletes **\`pending\`** row for Bearer user. **\`400 GROUP_INVITE_NOT_PENDING\`** if already **\`active\`**. Success **\`200\`:** envelope with **\`data.groupId\`** set to that group.

| Field | Meaning |
|---|---|
| \`identifier\` | International phone (\`User.identifier\`, OTP rules) |
| \`username\` | Stored handle \`[a-z0-9_]\` (3–32), case-insensitive; requires \`username\` on \`users\` first |
| \`userId\` | UUID of the user |

**Exactly one** of the above must appear in each request.

**\`POST\`** (create group) — JSON body:

| Field | Required | Rules |
|---|---|---|
| \`name\` | ✅ | String; trimmed; **2–50** characters |
| \`type\` | ✅ | One of: \`trip\`, \`home\`, \`couple\`, \`office\`, \`other\` |
| \`avatar\` | ❌ | When present: valid \`http\` or \`https\` URL (group image); omit entirely if none |

**Response (\`201\`):** \`{ "success": true, "data": { ... } }\` — \`data.avatar\` is the image URL or \`null\` if unset.

## Authentication Flow

1. \`POST /v1/otp/send\` — client submits phone → receives \`sessionId\`
2. (User enters 6-digit code delivered via SMS)
3. \`POST /v1/otp/verify\` — \`sessionId\` + OTP + \`Idempotency-Key\` header → JWTs; non-expired **\`group_invites\`** for that phone → **deleted** / replaced by **\`pending\`** **\`group_members\`** (then **accept** / **decline**)
4. Use \`Authorization: Bearer <accessToken>\` on protected endpoints
5. \`GET /v1/auth/me\` — optional on app start: profile + onboarding hints (\`hasDisplayName\`, \`hasAvatar\`, \`hasUseCase\`, \`isOnboardingComplete\`)
6. \`POST /v1/upload/avatar\` (multipart) → receive \`{ url }\` for the new avatar
7. \`PATCH /v1/auth/me\` — update \`name\`, \`avatarUrl\`, \`useCase\`, and finally \`onboardingCompleted: true\`
8. When access token expires → \`POST /v1/auth/refresh\` with refresh token → receives **new** pair (old refresh is invalidated)
9. \`POST /v1/auth/logout\` revokes the refresh token

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
| \`VALIDATION_ERROR\` | 400 | Request body or **query** failed DTO validation (e.g. \`GET /v1/users/search\`) |
| \`INVALID_OTP\` | 400 | Wrong OTP code entered |
| \`INVALID_IDENTIFIER\` | 400 | Phone or email is invalid |
| \`IDEMPOTENCY_KEY_REQUIRED\` | 400 | Missing \`Idempotency-Key\` header |
| \`IDEMPOTENCY_KEY_INVALID\` | 400 | Malformed key (>64 chars or empty) |
| \`REFRESH_TOKEN_REQUIRED\` | 400 | Missing \`refreshToken\` in body |
| \`DISPLAY_NAME_INVALID\` | 400 | Empty name after normalization |
| \`INVALID_CONTACT_PHONE\` | 400 | \`POST /v1/contacts/sync\` — row could not be parsed to E.164 |
| \`INVITE_SELF\` | 400 | Add-member: bearer user matches \`identifier\` |
| \`GROUP_INVITE_NOT_PENDING\` | 400 | Decline/accept invariant failed (e.g. already active member) |
| \`GROUP_INVITE_PREVIEW_NOT_PENDING\` | 403 | **\`GET …/invite-preview\`** — membership exists but is not **\`pending\`** (already joined) |
| \`AVATAR_FILE_REQUIRED\` | 400 | Multipart \`file\` field missing on upload |
| \`AVATAR_FILE_TYPE_INVALID\` | 400 | Avatar MIME type not allowed |
| \`UNAUTHORIZED\` | 401 | No / malformed Authorization header |
| \`INVALID_TOKEN\` | 401 | Token malformed |
| \`TOKEN_EXPIRED\` | 401 | Access token expired |
| \`INVALID_SIGNATURE\` | 401 | Token tampered / wrong secret |
| \`REFRESH_TOKEN_INVALID\` | 401 | Refresh token not found / revoked |
| \`REFRESH_TOKEN_EXPIRED\` | 401 | Refresh token past expiry |
| \`TOKEN_REUSED\` | 401 | Replay attack — sessions revoked |
| \`SESSION_REVOKED\` | 401 | User forced logout |
| \`ACCOUNT_INACTIVE\` | 403 | User deactivated |
| \`NOT_GROUP_MEMBER\` | 403 | Not an active member of this group |
| \`GROUP_OWNER_PROTECTED\` | 403 | Cannot remove owner membership via remove-member (leave / kick) |
| \`ADMIN_REMOVE_REQUIRES_OWNER\` | 403 | Admin tried to remove another admin — owner only |
| \`GROUP_ADMIN_REQUIRED\` | 403 | Admin or owner role required |
| \`GROUP_OWNER_REQUIRED\` | 403 | Owner role required (e.g. delete group) |
| \`USER_NOT_FOUND\` | 404 | User row missing |
| \`GROUP_MEMBER_NOT_FOUND\` | 404 | Membership row absent (kick/leave mismatch or concurrent delete) |
| \`GROUP_NOT_FOUND\` | 404 | Group id unknown / already deleted (server may map missing row / Prisma P2025 here) |
| \`SESSION_NOT_FOUND\` | 404 | OTP session never created or expired |
| \`ALREADY_GROUP_MEMBER\` | 409 | Row exists with **\`active\`** status (cannot re-invite) |
| \`INVITE_ALREADY_PENDING\` | 409 | **\`group_members\`** duplicate **\`pending\`** row for that registered user |
| \`IDEMPOTENCY_CONFLICT\` | 409 | Parallel request with same key in-flight |
| \`OTP_EXPIRED\` | 410 | OTP session expired (5 min TTL) |
| \`FILE_TOO_LARGE\` | 413 | Uploaded file exceeds 5 MB |
| \`SESSION_LOCKED\` | 423 | Too many failed attempts |
| \`COOLDOWN_ACTIVE\` | 429 | 60s cooldown between sends |
| \`CONTACT_SYNC_RATE_LIMIT_IP\` | 429 | \`POST /v1/contacts/sync\` — per-client-IP hourly quota |
| \`CONTACT_SYNC_RATE_LIMIT_USER\` | 429 | \`POST /v1/contacts/sync\` — per-account hourly quota |
| \`RATE_LIMITED_IP\` | 429 | IP quota exceeded |
| \`RATE_LIMITED_PHONE\` | 429 | Phone quota exceeded |
| \`VERIFY_RATE_LIMITED\` | 429 | Verify quota exceeded |
| \`MAX_ATTEMPTS\` | 429 | Hit 5 wrong OTPs |
| \`INTERNAL_ERROR\` | 500 | Infrastructure failure |
`;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Qisma API')
    .setDescription(swaggerDescription)
    .setVersion('1.0')
    .setContact(
      'Qisma',
      'https://github.com/imsazidkhan/qisma-be',
      'contact@example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('https://api.example.com', 'Production')
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
    .addTag('Auth', 'Token refresh, logout, current user, profile update')
    .addTag(
      'Users',
      'Joined groups (`GET /v1/users/me/groups`) + home cards (`GET /v1/users/me/groups/home`) + pending invites inbox (`GET /v1/users/me/group-invites`) + directory search (`GET /v1/users/search`)',
    )
    .addTag(
      'Upload',
      'Multipart uploads (avatar; expense receipts use **Expenses** → **`POST …/groups/{groupId}/expenses/{expenseId}/receipts`**)',
    )
    .addTag(
      'Contacts',
      'Device phones sync (`POST /v1/contacts/sync`) — E.164 parse; **registered** users: **id**, **name**, **username**, **avatar** only; **unregistered** = no active user; Redis limits',
    )
    .addTag(
      'Groups',
      'Groups: roster **`GET …/members`**, **`GET …/activity`** feed (**`group_activity_events`**), **`group_invites`** materialized at OTP verify (**pending** members), **`POST …/invites/accept` / decline**, PATCH role (owner), remove member, delete, create',
    )
    .addTag(
      'Expenses',
      'Create/update/soft-delete/read, comments, reactions, **receipt upload** (**`POST …/groups/{groupId}/expenses/{expenseId}/receipts`**), feed, detail — split engine, **`activity_logs`**, group balance snapshot',
    )
    .addTag('Health', 'Liveness & dependency readiness probe')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Qisma — API Docs',
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
  console.error('❌ Failed to bootstrap application:', err);
  process.exit(1);
});
