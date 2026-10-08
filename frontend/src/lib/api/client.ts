import type { FieldError } from './types';

/** Empty when the Next.js rewrite proxy is on (see next.config.ts), so requests stay same-origin. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY === 'true' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Fired when the API answers 401 for an authenticated call, so the app can send the user to /login. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Map of field name -> first message, for inline form errors. */
  get fieldMessages(): Record<string, string> {
    const messages: Record<string, string> = {};
    for (const error of this.fieldErrors) {
      if (error.field && !(error.field in messages)) messages[error.field] = error.message;
    }
    return messages;
  }
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  as?: 'json' | 'text';
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const queryString = params.toString();
  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, as = 'json' } = options;
  const headers: HeadersInit = {};
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload, credentials: 'include' });
  } catch {
    throw new ApiError('Cannot reach the Route 53 API. Check that the backend is running.', 0);
  }

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    let fieldErrors: FieldError[] = [];
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') message = data.detail;
      if (Array.isArray(data.errors)) fieldErrors = data.errors;
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 401 && !path.startsWith('/api/auth/') && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(message, response.status, fieldErrors);
  }

  if (response.status === 204) return undefined as T;
  return (as === 'text' ? await response.text() : await response.json()) as T;
}
