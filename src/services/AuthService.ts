
// import {
//   ApiError,
//   type AuthTokens,
//   type LoginRequest,
// } from '../api/ApiClient';

// import { apiClient } from '../api/client';
// import { tokenStorage } from './TokenStorage';

// class AuthService {
//   private tokens: AuthTokens | null = null;

//   private refreshPromise: Promise<string> | null = null;

//   // Login and securely save tokens.
//   async login(data: LoginRequest): Promise<AuthTokens> {
//     const response = await apiClient.login(data);

//     this.tokens = response.payload;

//     await tokenStorage.saveTokens(this.tokens);

//     return this.tokens;
//   }

//   // Restore tokens when the app starts.
//  async restoreSession(): Promise<AuthTokens | null> {
//   const savedTokens = await tokenStorage.getTokens();

//   if (!savedTokens) {
//     this.tokens = null;
//     return null;
//   }

//   this.tokens = savedTokens;

//   try {
//     await this.refreshAccessToken();
//     return this.tokens;
//   } catch {
//     await this.logout();
//     return null;
//   }
// }

//   // Logout and clear secure storage.
//   async logout(): Promise<void> {
//     this.tokens = null;

//     await tokenStorage.clearTokens();
//   }

//   // Return current tokens.
//   getTokens(): AuthTokens | null {
//     return this.tokens;
//   }

//   // Execute an authenticated API request.
//   async requestWithAuth<T>(
//     request: (accessToken: string) => Promise<T>,
//   ): Promise<T> {
//     if (!this.tokens) {
//       throw new ApiError('User is not authenticated', 401);
//     }

//     try {
//       return await request(this.tokens.accessToken);
//     } catch (error) {
//       if (!(error instanceof ApiError) || error.status !== 401) {
//         throw error;
//       }

//       // Refresh once and retry the original request.
//       const newAccessToken = await this.refreshAccessToken();

//       try {
//         return await request(newAccessToken);
//       } catch (retryError) {
//         if (
//           retryError instanceof ApiError &&
//           retryError.status === 401
//         ) {
//           await this.logout();
//         }

//         throw retryError;
//       }
//     }
//   }

//   // Share one refresh request across concurrent 401 responses.
//   private async refreshAccessToken(): Promise<string> {
//     if (!this.refreshPromise) {
//       this.refreshPromise = this.performTokenRefresh().finally(() => {
//         this.refreshPromise = null;
//       });
//     }

//     return this.refreshPromise;
//   }

//   private async performTokenRefresh(): Promise<string> {
//     try {
//       if (!this.tokens?.refreshToken) {
//         throw new ApiError('Refresh token not found', 401);
//       }

//       const response = await apiClient.refreshToken(
//         this.tokens.refreshToken,
//       );

//       this.tokens = {
//         ...this.tokens,
//         accessToken: response.payload.accessToken,
//       };

//       await tokenStorage.saveTokens(this.tokens);

//       return this.tokens.accessToken;
//     } catch (error) {
//       await this.logout();
//       throw error;
//     }
//   }
// }

// export const authService = new AuthService();

import {
  ApiError,
  type ApiClient,
  type AuthTokens,
  type LoginRequest,
} from '../api/ApiClient';

/** Secure storage abstraction (Keychain/Keystore in the app, a fake in tests). */
export interface TokenStore {
  saveTokens(tokens: AuthTokens): Promise<void>;
  getTokens(): Promise<AuthTokens | null>;
  clearTokens(): Promise<void>;
}

const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

/**
 * Owns the tokens (Redux only knows "signed in or not").
 *  - A 401 triggers ONE refresh, then the original request is retried ONCE.
 *  - Concurrent 401s share a single in-flight refresh call.
 *  - A request that failed with an already-replaced token is retried with the
 *    new token without refreshing again.
 *  - If the refresh is rejected (401), the session ends and listeners are told
 *    so the UI can return to Login. Network errors do NOT sign the user out.
 */
export class AuthService {
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<string> | null = null;
  private refreshCalls = 0;
  private listeners = new Set<() => void>();

  constructor(
    private readonly api: ApiClient,
    private readonly store: TokenStore,
  ) {}

  /** Called whenever the session ends (logout or failed refresh). */
  onSessionEnded(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Number of refresh API calls made so far (used by the debug Burst button). */
  getRefreshCallCount(): number {
    return this.refreshCalls;
  }

  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await this.api.login(data);
    if (!response.success) {
      throw new ApiError(response.message, 401);
    }
    this.tokens = response.payload;
    await this.store.saveTokens(response.payload);
    return response.payload;
  }

  /**
   * Cold start: load tokens from secure storage and renew the access token.
   * Returns null when the user has to sign in again.
   */
  async restoreSession(): Promise<AuthTokens | null> {
    const saved = await this.store.getTokens();
    if (!saved) {
      return null;
    }
    this.tokens = saved;

    try {
      await this.refreshAccessToken();
    } catch (error) {
      if (isUnauthorized(error)) {
        return null; // refresh was rejected, session already ended
      }
      // Offline etc.: keep the user signed in, requests will retry the refresh.
    }
    return this.tokens;
  }

  async logout(): Promise<void> {
    await this.endSession();
  }

  async requestWithAuth<T>(
    request: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    if (!this.tokens) {
      throw new ApiError('User is not authenticated', 401);
    }
    const usedToken = this.tokens.accessToken;

    try {
      return await request(usedToken);
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error;
      }

      const freshToken = await this.getFreshToken(usedToken);

      try {
        return await request(freshToken);
      } catch (retryError) {
        if (isUnauthorized(retryError)) {
          await this.endSession();
        }
        throw retryError;
      }
    }
  }

  private async getFreshToken(failedToken: string): Promise<string> {
    // Someone else already refreshed while our request was in flight.
    if (this.tokens && this.tokens.accessToken !== failedToken) {
      return this.tokens.accessToken;
    }
    return this.refreshAccessToken();
  }

  private refreshAccessToken(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performTokenRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performTokenRefresh(): Promise<string> {
    const current = this.tokens;
    if (!current) {
      throw new ApiError('User is not authenticated', 401);
    }

    this.refreshCalls += 1;

    try {
      const response = await this.api.refreshToken(current.refreshToken);
      if (!response.success) {
        throw new ApiError(response.message, 401);
      }
      if (!this.tokens) {
        throw new ApiError('Session ended during refresh', 401);
      }

      this.tokens = { ...this.tokens, accessToken: response.payload.accessToken };
      await this.store.saveTokens(this.tokens);
      return response.payload.accessToken;
    } catch (error) {
      if (isUnauthorized(error)) {
        await this.endSession();
      }
      throw error;
    }
  }

  private async endSession(): Promise<void> {
    const wasSignedIn = this.tokens !== null;
    this.tokens = null;
    await this.store.clearTokens();
    if (wasSignedIn) {
      this.listeners.forEach(listener => listener());
    }
  }
}
