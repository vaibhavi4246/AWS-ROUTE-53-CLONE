import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, AUTH_EXPIRED_EVENT, apiRequest } from './client';

function respond(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('apiRequest', () => {
  it('sends JSON with credentials and builds the query string without empty values', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(200, { ok: true }));
    await apiRequest('/api/things', { method: 'POST', body: { a: 1 }, query: { page: 2, query: '', type: undefined, sort_by: 'name' } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/things\?page=2&sort_by=name$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: '{"a":1}' });
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('does not force a content type for FormData uploads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(200, {}));
    await apiRequest('/upload', { method: 'POST', body: new FormData() });
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({});
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(204));
    await expect(apiRequest('/api/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('turns an error body into an ApiError with per-field messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respond(422, { detail: 'bad value', errors: [{ field: 'value', message: 'not an IP' }, { field: 'value', message: 'second' }] }),
    );
    const error = (await apiRequest('/api/x').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe('bad value');
    expect(error.fieldMessages).toEqual({ value: 'not an IP' });
  });

  it('announces an expired session for 401s on data routes but not on auth routes', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(401, { detail: 'nope' }));
    await apiRequest('/api/hosted-zones').catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);

    await apiRequest('/api/auth/me').catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it('reports an unreachable backend in plain language', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/api/x')).rejects.toThrow(/Cannot reach the Route 53 API/);
  });
});
