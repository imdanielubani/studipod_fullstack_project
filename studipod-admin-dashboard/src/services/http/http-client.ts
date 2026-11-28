import type { z } from 'zod';

import { apiErrorBodySchema, successEnvelope } from '@/types/api';

import { ApiError, CLIENT_ERROR_CODES } from './api-error';

const DEFAULT_TIMEOUT_MS = 15_000;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions<TSchema extends z.ZodType | undefined> = {
  method?: HttpMethod;
  body?: unknown;
  /** Validates `data` in the success envelope. Omit for responses without a body (204). */
  schema?: TSchema;
  /** Attach the in-memory access token and refresh once on 401. */
  authenticated?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Readonly<Record<string, string>>;
};

type ResponseData<TSchema> = TSchema extends z.ZodType ? z.infer<TSchema> : undefined;

/** Hooks the session layer registers so the client can authenticate requests. */
export type AuthBridge = {
  getAccessToken: () => string | null;
  /** Obtains a new access token; resolves to null when the session cannot be renewed. */
  refreshAccessToken: () => Promise<string | null>;
  /** Called when an authenticated request still fails with 401 after a refresh. */
  onAuthenticationLost: () => void;
};

let authBridge: AuthBridge | null = null;

export function registerAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

function createRequestId(): string {
  return globalThis.crypto.randomUUID();
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(status: number, body: unknown, requestId: string): ApiError {
  const parsed = apiErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError({
      status,
      code: status >= 500 ? 'SERVER_ERROR' : CLIENT_ERROR_CODES.invalidResponse,
      message: `Request failed with status ${status}.`,
      requestId,
    });
  }
  const { code, message, details, meta, requestId: serverRequestId } = parsed.data.error;
  return new ApiError({
    status,
    code,
    message,
    requestId: serverRequestId ?? requestId,
    fieldErrors: details ?? [],
    meta: meta ?? {},
  });
}

function linkAbortSignals(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  let didTimeOut = false;
  const timer = setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  external?.addEventListener('abort', forwardAbort, { once: true });
  if (external?.aborted) controller.abort();

  return {
    signal: controller.signal,
    didTimeOut: () => didTimeOut,
    dispose: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', forwardAbort);
    },
  };
}

export type HttpClient = {
  request<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>>;
};

/**
 * Creates a JSON client for the Studipod API.
 *
 * - Sends cookies (`credentials: 'include'`) so the HttpOnly refresh cookie reaches the API.
 * - Adds `X-Request-Id` to every request for correlation with backend logs.
 * - Unwraps `{ data }`, validates it with the given Zod schema and maps failures to ApiError.
 * - For authenticated calls, refreshes the access token once on 401 and retries.
 */
export function createHttpClient(baseUrl: string): HttpClient {
  async function send(
    path: string,
    options: RequestOptions<z.ZodType | undefined>,
    accessToken: string | null,
  ): Promise<{ response: Response; requestId: string }> {
    const requestId = createRequestId();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestId,
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const abort = linkAbortSignals(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.signal);
    try {
      const response = await fetch(joinUrl(baseUrl, path), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'include',
        cache: 'no-store',
        signal: abort.signal,
      });
      return { response, requestId };
    } catch (error: unknown) {
      if (options.signal?.aborted) throw error;
      throw new ApiError({
        status: 0,
        code: abort.didTimeOut() ? CLIENT_ERROR_CODES.timeout : CLIENT_ERROR_CODES.network,
        message: abort.didTimeOut()
          ? 'The request took too long to complete.'
          : 'The server could not be reached.',
        requestId,
      });
    } finally {
      abort.dispose();
    }
  }

  async function request<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options: RequestOptions<TSchema> = {},
  ): Promise<ResponseData<TSchema>> {
    const bridge = options.authenticated ? authBridge : null;
    let { response, requestId } = await send(path, options, bridge?.getAccessToken() ?? null);

    if (response.status === 401 && bridge) {
      const renewedToken = await bridge.refreshAccessToken();
      if (!renewedToken) {
        bridge.onAuthenticationLost();
        throw toApiError(401, await parseJson(response), requestId);
      }
      ({ response, requestId } = await send(path, options, renewedToken));
      if (response.status === 401) {
        bridge.onAuthenticationLost();
      }
    }

    const body = await parseJson(response);
    if (!response.ok) throw toApiError(response.status, body, requestId);
    if (!options.schema) return undefined as ResponseData<TSchema>;

    const envelope: z.ZodType<{ data: unknown }> = successEnvelope(options.schema as z.ZodType);
    const parsed = envelope.safeParse(body);
    if (!parsed.success) {
      throw new ApiError({
        status: response.status,
        code: CLIENT_ERROR_CODES.invalidResponse,
        message: 'The server returned an unexpected response.',
        requestId,
      });
    }
    return parsed.data.data as ResponseData<TSchema>;
  }

  return { request };
}
