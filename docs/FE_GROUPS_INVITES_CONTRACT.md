# Frontend contract — groups, invites, roster (Phase D)

Handoff for mobile/web clients integrating **group membership** and **invites** with this service. Authoritative field-level docs remain **Swagger** (`/docs`); this file is the **product + behaviour** contract.

---

## Home screen: joined groups (not “created by me”)

Use **`GET /v1/users/me/groups`** for the **default “my groups” / home list** after login. It returns every **`active`** membership with a slim **group** object, **`role`**, **`joinedAt`**, and **`isCreator`** (so the client can badge “You created this” without calling **`GET /v1/groups`**).

**`GET /v1/groups`** remains **only groups you created** (`Group.createdByUserId`). Invitees who **joined** another user’s group will see it under **`/users/me/groups`**, not under **`GET /v1/groups`**.

For the **group detail** screen (full **`GroupDataDto`** — name, type, avatar, **`createdByUserId`**, timestamps): use **`GET /v1/groups/:groupId/member-profile`** when the user is an **active** member but **not** necessarily the creator. **`GET /v1/groups/:groupId`** stays **creator-only** — non-creators correctly get **`404 GROUP_NOT_FOUND`**, so clients must **not** rely on that route alone for everyone’s detail view.

---

## Response envelope

**Success** (HTTP `2xx` as documented per route):

```json
{ "success": true, "data": … }
```

`data` shape depends on the endpoint (object, array, or minimal `{ "groupId": "…" }` on decline).

**Error**:

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable message",
    "retryAfter": 60
  }
}
```

`retryAfter` (seconds) appears on rate-limit / cooldown style errors when applicable.

---

## Enums the UI must understand

### Roster row: `status` (`GroupMemberRosterEntryDto`)

| Value | Meaning |
|--------|--------|
| `active` | User has joined; `joinedAt` is set. |
| `pending` | Invited (**registered** or offline phone → materialized after OTP); **not** yet accepted; `joinedAt` is `null`. |

**Split UIs** (e.g. “who can split a bill”): filter **`status === 'active'`** so pending invitees are excluded.

### Roster row: `role`

`owner` | `admin` | `member` — sort order from **`GET /v1/groups/:groupId/members`** is already **owner → admin → member**, then join order.

### Invites inbox row (`GET /v1/users/me/group-invites`)

Each item describes a **pending `group_members` row** for the current user (**registered-target invite**, or **`group_invites` materialized at first `POST /v1/otp/verify`**). Raw `group_invites` rows (**before** the user signs up and has a JWT) are **not** returned here.

---

## Who can call what

| Actor | Endpoint | Notes |
|--------|----------|--------|
| **Any authenticated user** | `GET /v1/users/me/groups` | **Home:** all **active** memberships (joined groups). **Pending** not included. |
| **Pending invitee** | `GET /v1/users/me/group-invites` | Inbox list; primary source of `groupId` for accept/decline. |
| **Pending invitee** | `GET /v1/groups/:groupId/invite-preview` | Optional **minimal** preview (`id`, name, type, avatar, **active-only** `memberCount`). **403** `GROUP_INVITE_PREVIEW_NOT_PENDING` if already active. |
| **Pending invitee** | `POST /v1/groups/:groupId/invites/accept` \| `…/decline` | Mutations; **no** body required. |
| **Pending invitee** | `GET /v1/groups/:groupId/members` | **Not allowed** — **403 `NOT_GROUP_MEMBER`** (must be **active**). |
| **Active** member (any role) | `GET /v1/groups/:groupId/members` | Full roster; includes both **`active`** and **`pending`** rows. **Admins/owners** use this for **pending badges** on people they invited. |
| **Active** member (any role) | `GET /v1/groups/:groupId/member-profile` | Full **`GroupDataDto`** for group metadata (same shape as creator **`GET …/:groupId`**). Use for **detail** when the user joined via invite — **not** creator-only. |

**Creators** using `GET /v1/groups` / `GET /v1/groups/:groupId` are a **separate** “groups I created” view; roster for a specific group still comes from **`…/members`** when the user is an **active** member there. **Metadata** for non-creator active members comes from **`member-profile`**.

---

## Polling vs navigation (MVP)

**Poll / refresh** (no push in MVP):

| Trigger | What to refresh |
|---------|------------------|
| App cold start / session restore | `GET /v1/users/me/groups` (home list) and `GET /v1/users/me/group-invites` (badge = `data.length`). |
| After **`POST /v1/otp/verify`** | Inbox again (reload token bump); offline-phone invites become **pending** `group_members` — user must **accept** or **decline**. |
| Pull-to-refresh on Invites screen | Same inbox endpoint. |
| Optional: tab focus | Same (e.g. `useFocusEffect` in React Navigation). |

**Navigate** (after success):

| Action | Next step |
|--------|-----------|
| **Accept** invite | `POST …/invites/accept` → **200** includes roster but client may navigate to **group home** and then call **`GET …/members`** as an **active** member. |
| **Decline** | `POST …/decline` → remove row locally; stay on inbox or pop stack. |

**Do not** rely on **`GET …/members`** for the invitee **before** accept; use **`invite-preview`** only if you need richer context than the inbox row.

---

## Admin / owner UX alignment

- **Single source of truth** for “who is in this group” (including invites not yet accepted): **`GET /v1/groups/:groupId/members`** for any **active** **owner** or **admin** (or **member**).
- Show **pending** chip/badge when `status === 'pending'` on roster entries.
- **Removing** a pending user: existing **`DELETE /v1/groups/:groupId/members/:memberId`** (admin/owner rules per API).

---

## Retention / stale pending (optional, not MVP)

- Today there is **no** server-side automatic expiry for **`group_members.status = pending`**.
- **`group_invites`** (phone-not-registered path) already has **`expiresAt`** (~14 days in app constants) and cleanup/claim rules on verify.
- If product later requires “invite expires after N days”, add: **policy** (e.g. 30 days), **cron or scheduled job**, and optionally notify invitees once before delete. **Out of MVP scope** unless requested.

---

## Client sample code

See **`client-integration/group-invites/`** in this repo for fetch helpers and a React Native **invites screen** sample (Phase B kit).
