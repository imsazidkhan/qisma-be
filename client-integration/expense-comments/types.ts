/** Mirrors backend **`ExpenseUserSnippetDto`**. */
export type ExpenseUserSnippet = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
};

/** Mirrors **`ExpenseCommentEntryDto`**. */
export type ExpenseCommentEntry = {
  id: string;
  userId: string;
  message: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: ExpenseUserSnippet;
};

/** Mirrors **`ExpenseCommentPageDto`**. */
export type ExpenseCommentPage = {
  items: ExpenseCommentEntry[];
  nextCursor: string | null;
};

export type ApiSuccessEnvelope<T> = { success: true; data: T };
export type ApiErrorEnvelope = {
  success: false;
  error: { code: string; message: string; retryAfter?: number };
};

export type CommentClientConfig = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  appHeaders?: Record<string, string>;
};
