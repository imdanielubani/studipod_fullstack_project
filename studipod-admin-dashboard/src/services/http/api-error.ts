/** Error codes produced by the client itself (no response from the backend). */
export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  timeout: 'REQUEST_TIMEOUT',
  invalidResponse: 'INVALID_RESPONSE',
} as const;

type ApiErrorInit = {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: ReadonlyArray<{ field: string; issue: string }>;
  meta?: Readonly<Record<string, unknown>>;
};

/**
 * Normalised error for every failed API call.
 *
 * `status` is 0 when no HTTP response was received (offline, DNS, CORS, timeout).
 * Callers branch on the stable `code`, never on `message`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly fieldErrors: ReadonlyArray<{ field: string; issue: string }>;
  readonly meta: Readonly<Record<string, unknown>>;

  constructor({ status, code, message, requestId, fieldErrors = [], meta = {} }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fieldErrors = fieldErrors;
    this.meta = meta;
  }

  /** True when the request never reached the backend or timed out. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Network failures and server errors may succeed on retry; client errors will not. */
  get isRetryable(): boolean {
    return this.isNetworkError || this.status >= 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
