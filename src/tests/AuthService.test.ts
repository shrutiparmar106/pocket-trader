import {
  ApiError,
  type Account,
  type ApiClient,
  type AuthTokens,
} from '../api/ApiClient';
import { MockApiClient } from '../mocks/MockApiClient';
import { AuthService, type TokenStore } from '../services/AuthService';

class MemoryStore implements TokenStore {
  saved: AuthTokens | null = null;
  async saveTokens(tokens: AuthTokens) {
    this.saved = tokens;
  }
  async getTokens() {
    return this.saved;
  }
  async clearTokens() {
    this.saved = null;
  }
}

const account: Account = { login: 1, currency: 'USD', balance: 1, equity: 1 };
const ok = <T,>(payload: T) => ({ success: true, message: 'ok', payload });
const unauthorized = () => new ApiError('Access token expired', 401);

/** Tiny deterministic API: refreshToken is a jest.fn we can control. */
function makeApi(refresh?: jest.Mock): ApiClient {
  return {
    login: jest.fn().mockResolvedValue(
      ok({ accessToken: 'access-0', refreshToken: 'refresh-0' }),
    ),
    refreshToken: refresh ?? jest.fn().mockResolvedValue(ok({ accessToken: 'access-1' })),
    getAccount: jest.fn().mockResolvedValue(ok(account)),
    getSymbols: jest.fn(),
    placeTrade: jest.fn(),
  } as unknown as ApiClient;
}

async function signedInService(api: ApiClient, store = new MemoryStore()) {
  const service = new AuthService(api, store);
  await service.login({ email: 'a@b.c', password: 'Demo@1234' });
  return { service, store };
}

describe('AuthService token refresh', () => {
  it('stores tokens on login', async () => {
    const { store } = await signedInService(makeApi());
    expect(store.saved).toEqual({ accessToken: 'access-0', refreshToken: 'refresh-0' });
  });

  it('refreshes once on a 401 and retries the original request with the new token', async () => {
    const api = makeApi();
    const { service, store } = await signedInService(api);
    const request = jest
      .fn()
      .mockRejectedValueOnce(unauthorized())
      .mockResolvedValueOnce('done');

    await expect(service.requestWithAuth(request)).resolves.toBe('done');

    expect(api.refreshToken).toHaveBeenCalledTimes(1);
    expect(api.refreshToken).toHaveBeenCalledWith('refresh-0');
    expect(request).toHaveBeenNthCalledWith(1, 'access-0');
    expect(request).toHaveBeenNthCalledWith(2, 'access-1');
    expect(store.saved?.accessToken).toBe('access-1'); // persisted
  });

  it('makes only ONE refresh call when several requests fail at the same time', async () => {
    const refresh = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve(ok({ accessToken: 'access-1' })), 20)),
    );
    const { service } = await signedInService(makeApi(refresh as unknown as jest.Mock));

    const call = (token: string) =>
      token === 'access-0' ? Promise.reject(unauthorized()) : Promise.resolve(token);

    const results = await Promise.all([
      service.requestWithAuth(call),
      service.requestWithAuth(call),
      service.requestWithAuth(call),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['access-1', 'access-1', 'access-1']);
  });

  it('does not refresh again when a late 401 used a token that was already replaced', async () => {
    const refresh = jest.fn().mockResolvedValue(ok({ accessToken: 'access-1' }));
    const { service } = await signedInService(makeApi(refresh));

    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));

    // Slow request: sent with access-0, its 401 only arrives after the refresh.
    const slow = service.requestWithAuth(async token => {
      if (token === 'access-0') {
        await gate;
        throw unauthorized();
      }
      return token;
    });

    // Fast request triggers the refresh first.
    await service.requestWithAuth(async token => {
      if (token === 'access-0') {
        throw unauthorized();
      }
      return token;
    });
    release();

    await expect(slow).resolves.toBe('access-1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ends the session (back to Login) when the refresh is rejected', async () => {
    const refresh = jest.fn().mockRejectedValue(new ApiError('Refresh token expired', 401));
    const { service, store } = await signedInService(makeApi(refresh));
    const onEnded = jest.fn();
    service.onSessionEnded(onEnded);

    await expect(
      service.requestWithAuth(() => Promise.reject(unauthorized())),
    ).rejects.toMatchObject({ status: 401 });

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(store.saved).toBeNull();
  });

  it('notifies only once even if several requests fail together', async () => {
    const refresh = jest.fn().mockRejectedValue(new ApiError('Refresh token expired', 401));
    const { service } = await signedInService(makeApi(refresh));
    const onEnded = jest.fn();
    service.onSessionEnded(onEnded);

    const failing = () => service.requestWithAuth(() => Promise.reject(unauthorized()));
    await Promise.allSettled([failing(), failing(), failing()]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('does not loop forever if the retry is also a 401', async () => {
    const api = makeApi();
    const { service } = await signedInService(api);
    const onEnded = jest.fn();
    service.onSessionEnded(onEnded);
    const request = jest.fn().mockRejectedValue(unauthorized());

    await expect(service.requestWithAuth(request)).rejects.toMatchObject({ status: 401 });

    expect(request).toHaveBeenCalledTimes(2); // original + exactly one retry
    expect(api.refreshToken).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for non-401 errors', async () => {
    const api = makeApi();
    const { service } = await signedInService(api);

    await expect(
      service.requestWithAuth(() => Promise.reject(new ApiError('boom', 500))),
    ).rejects.toMatchObject({ status: 500 });

    expect(api.refreshToken).not.toHaveBeenCalled();
  });

  it('keeps the user signed in when the refresh fails because of the network', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('Network request failed'));
    const { service, store } = await signedInService(makeApi(refresh));
    const onEnded = jest.fn();
    service.onSessionEnded(onEnded);

    await expect(
      service.requestWithAuth(() => Promise.reject(unauthorized())),
    ).rejects.toThrow('Network request failed');

    expect(onEnded).not.toHaveBeenCalled();
    expect(store.saved).not.toBeNull();
  });

  it('restores a session from storage on cold start (and renews the access token)', async () => {
    const store = new MemoryStore();
    store.saved = { accessToken: 'stale', refreshToken: 'refresh-0' };
    const service = new AuthService(makeApi(), store);

    await expect(service.restoreSession()).resolves.toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-0',
    });
  });

  it('returns null on cold start when nothing is stored', async () => {
    const service = new AuthService(makeApi(), new MemoryStore());
    await expect(service.restoreSession()).resolves.toBeNull();
  });
});

describe('AuthService with MockApiClient (integration)', () => {
  it('a Burst of 3 calls with an expired token triggers exactly one refresh', async () => {
    const mock = new MockApiClient({ latency: false });
    const refreshSpy = jest.spyOn(mock, 'refreshToken');
    const { service } = await signedInService(mock);

    mock.forceExpire();

    const results = await Promise.all(
      [1, 2, 3].map(() => service.requestWithAuth(token => mock.getAccount(token))),
    );

    expect(results.every(r => r.success)).toBe(true);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(service.getRefreshCallCount()).toBe(1);
  });
});