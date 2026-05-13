import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  InviteClientConfig,
  PendingGroupInviteEntry,
} from './types';

function trimBase(url: string): string {
  return url.replace(/\/+$/, '');
}

function authHeadersBearer(
  token: string,
  extras?: Record<string, string>,
): Record<string, string> {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...extras,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text.length === 0 ? null : JSON.parse(text);
  } catch {
    throw new InviteApiError(
      'INVALID_JSON',
      `Expected JSON (${response.status}): ${text.slice(0, 160)}`,
    );
  }
}

export class InviteApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'InviteApiError';
  }
}

async function unwrapSuccess<T>(
  response: Response,
  context: string,
): Promise<T> {
  const body = (await readJson(response)) as
    | ApiSuccessEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok || !body || body.success !== true) {
    const fail = body as ApiErrorEnvelope | null;
    const code =
      fail?.success === false ? fail.error.code : `HTTP_${String(response.status)}`;
    const message =
      fail?.success === false
        ? fail.error.message
        : `${context} failed (${String(response.status)})`;
    throw new InviteApiError(code, message, response.status);
  }
  return body.data;
}

/** `GET /v1/users/me/group-invites` */
export async function fetchPendingGroupInvites(
  cfg: InviteClientConfig,
): Promise<PendingGroupInviteEntry[]> {
  const token = await cfg.getAccessToken();
  if (!token) {
    throw new InviteApiError('NOT_AUTHENTICATED', 'No access token');
  }

  const url = `${trimBase(cfg.baseUrl)}/v1/users/me/group-invites`;
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeadersBearer(token, cfg.appHeaders),
  });

  const data = await unwrapSuccess(res, 'List pending invites');
  if (!Array.isArray(data)) {
    throw new InviteApiError(
      'INVALID_SHAPE',
      'Expected data array from /users/me/group-invites',
    );
  }
  return data as PendingGroupInviteEntry[];
}

/** `POST /v1/groups/:groupId/invites/accept` → roster payload (caller may ignore). */
export async function postAcceptGroupInvite(
  cfg: InviteClientConfig,
  groupId: string,
): Promise<unknown[]> {
  const token = await cfg.getAccessToken();
  if (!token) {
    throw new InviteApiError('NOT_AUTHENTICATED', 'No access token');
  }

  const url = `${trimBase(cfg.baseUrl)}/v1/groups/${groupId}/invites/accept`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeadersBearer(token, cfg.appHeaders),
  });

  const data = await unwrapSuccess(res, 'Accept invite');
  if (!Array.isArray(data)) {
    throw new InviteApiError('INVALID_SHAPE', 'Expected roster array');
  }
  return data as unknown[];
}

/** `POST /v1/groups/:groupId/invites/decline` → `{ groupId }` */
export async function postDeclineGroupInvite(
  cfg: InviteClientConfig,
  groupId: string,
): Promise<{ groupId: string }> {
  const token = await cfg.getAccessToken();
  if (!token) {
    throw new InviteApiError('NOT_AUTHENTICATED', 'No access token');
  }

  const url = `${trimBase(cfg.baseUrl)}/v1/groups/${groupId}/invites/decline`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeadersBearer(token, cfg.appHeaders),
  });

  const data = await unwrapSuccess(res, 'Decline invite');
  if (
    typeof data !== 'object' ||
    data === null ||
    !('groupId' in data) ||
    typeof (data as { groupId?: unknown }).groupId !== 'string'
  ) {
    throw new InviteApiError(
      'INVALID_SHAPE',
      'Expected { groupId } from decline',
    );
  }
  return { groupId: (data as { groupId: string }).groupId };
}
