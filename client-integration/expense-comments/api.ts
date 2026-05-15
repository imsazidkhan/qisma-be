import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  CommentClientConfig,
  ExpenseCommentPage,
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
    throw new CommentApiError(
      'INVALID_JSON',
      `Expected JSON (${response.status}): ${text.slice(0, 160)}`,
    );
  }
}

export class CommentApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'CommentApiError';
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
    throw new CommentApiError(code, message, response.status);
  }
  return body.data;
}

export type FetchExpenseCommentsPageParams = {
  groupId: string;
  expenseId: string;
  /** Omit → top-level only. Set → replies under this root id. */
  parentCommentId?: string | null;
  cursor?: string | null;
  limit?: number;
  /** **`asc`** default API — **`desc`** for newest-first page + load older via cursor. */
  sort?: 'asc' | 'desc';
};

/**
 * **`GET /v1/groups/:groupId/expenses/:expenseId/comments`**
 *
 * Pass **`data.nextCursor`** from the previous response as **`cursor`** for the next page.
 * Keep **`parentCommentId`** identical across pages; changing it requires resetting **`cursor`**.
 */
export async function fetchExpenseCommentsPage(
  cfg: CommentClientConfig,
  params: FetchExpenseCommentsPageParams,
): Promise<ExpenseCommentPage> {
  const token = await cfg.getAccessToken();
  if (!token) {
    throw new CommentApiError('NOT_AUTHENTICATED', 'No access token');
  }

  const limit = params.limit ?? 20;
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  if (params.cursor) {
    q.set('cursor', params.cursor);
  }
  if (params.parentCommentId?.trim()) {
    q.set('parentCommentId', params.parentCommentId.trim());
  }
  if (params.sort && params.sort !== 'asc') {
    q.set('sort', params.sort);
  }

  const url = `${trimBase(cfg.baseUrl)}/v1/groups/${params.groupId}/expenses/${params.expenseId}/comments?${q.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeadersBearer(token, cfg.appHeaders),
  });

  const data = await unwrapSuccess<ExpenseCommentPage>(res, 'List expense comments');
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new CommentApiError(
      'INVALID_SHAPE',
      'Expected { items: [], nextCursor } from comments list',
    );
  }
  return {
    items: data.items,
    nextCursor:
      data.nextCursor === undefined || data.nextCursor === null
        ? null
        : data.nextCursor,
  };
}
