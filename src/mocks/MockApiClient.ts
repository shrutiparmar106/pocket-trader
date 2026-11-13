// import type { ApiClient } from '../api/ApiClient';
// import {
//   ApiError,
//   type LoginRequest,
//   type AuthTokens,
//   type Account,
//   type TradeRequest,
//   type TradeResponse,
// } from '../api/ApiClient';

// import {
//   SYMBOLS,
//   DEMO_PASSWORD,
//   INITIAL_ACCOUNT,
//   ACCESS_TOKEN_TTL_MS,
//   type Envelope,
//   type SymbolInfo,
//   SEED_PRICES,
// } from './data';

// const delay = (ms: number) =>
//   new Promise<void>(resolve => setTimeout(resolve, ms));

// const randomDelay = () => delay(200 + Math.floor(Math.random() * 601));

// export class MockApiClient implements ApiClient {
//   private currentAccessToken = '';
//   private tokenCounter = 1;

//   private currentRefreshToken = '';

//   private accessTokenExpiry = 0;

//   private account: Account = { ...INITIAL_ACCOUNT };

//   private createAccessToken(): string {
//     const token = `mock-access-${this.tokenCounter++}`;

//     this.accessTokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;

//     this.currentAccessToken = token;

//     return token;
//   }

//   private validateAccessToken(token: string): void {
//     const isValid =
//       token === this.currentAccessToken && this.accessTokenExpiry > Date.now();

//     if (!isValid) {
//       throw new ApiError('Access token expired', 401);
//     }
//   }

//   async login(data: LoginRequest): Promise<Envelope<AuthTokens>> {
//     await randomDelay();

//     if (!data.email.trim() || data.password !== DEMO_PASSWORD) {
//       throw new ApiError('Invalid email or password', 401);
//     }

//     const accessToken = this.createAccessToken();

//     this.currentRefreshToken = `mock-refresh-${Date.now()}`;

//     return {
//       success: true,
//       message: 'Login successful',
//       payload: {
//         accessToken,
//         refreshToken: this.currentRefreshToken,
//       },
//     };
//   }

//   async refreshToken(
//     refreshToken: string,
//   ): Promise<Envelope<{ accessToken: string }>> {
//     await randomDelay();

//    if (!refreshToken.startsWith('mock-refresh-')) {
//   throw new ApiError('Refresh token expired', 401);
// }

// this.currentRefreshToken = refreshToken;
    

//     const accessToken = this.createAccessToken();

//     return {
//       success: true,
//       message: 'Token refreshed successfully',
//       payload: { accessToken },
//     };
//   }

//   async getAccount(accessToken: string): Promise<Envelope<Account>> {
//   this.validateAccessToken(accessToken);

//   return {
//     success: true,
//     message: 'Account fetched successfully',
//     payload: { ...this.account },
//   };
// }

//   async getSymbols(accessToken: string): Promise<Envelope<SymbolInfo[]>> {
//     await randomDelay();

//     this.validateAccessToken(accessToken);

//     return {
//       success: true,
//       message: 'Symbols fetched successfully',
//       payload: SYMBOLS,
//     };
//   }

//   async placeTrade(
//     accessToken: string,
//     data: TradeRequest,
//   ): Promise<Envelope<TradeResponse>> {
//     await delay(1000);

//     this.validateAccessToken(accessToken);

//     if (Math.random() < 0.2) {
//       throw new ApiError(
//         'Order rejected: price changed, please try again',
//         400,
//       );
//     }

//     const result: TradeResponse = {
//       ticket: Math.floor(100000 + Math.random() * 900000),
//       openPrice: (() => {
//         const price = SEED_PRICES.find(item => item.symbol === data.symbol);

//         if (!price) {
//           throw new ApiError('Symbol not found', 404);
//         }

//         return data.side === 'BUY' ? price.bid + price.spread : price.bid;
//       })(),
//       openTime: Math.floor(Date.now() / 1000),
//     };

//     return {
//       success: true,
//       message: `${data.side} order placed successfully`,
//       payload: result,
//     };
//   }
// }
import {
  ApiError,
  type Account,
  type ApiClient,
  type AuthTokens,
  type LoginRequest,
  type TradeRequest,
  type TradeResponse,
} from '../api/ApiClient';

import {
  ACCESS_TOKEN_TTL_MS,
  DEMO_PASSWORD,
  INITIAL_ACCOUNT,
  SEED_PRICES,
  SYMBOLS,
  type Envelope,
  type SymbolInfo,
} from './data';

const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const randomDelay = () => delay(200 + Math.floor(Math.random() * 601));

// Fake cost of opening a trade, deducted from equity so the account bar moves.
const COMMISSION_PER_LOT = 7;

type MockApiOptions = {
  /** Live price source, so orders fill at the current price. */
  getLatestPrice?: (symbol: string) => { bid: number; ask: number } | undefined;
  /** Injectable for deterministic tests. */
  random?: () => number;
  /** Set to false in tests to skip the delays. */
  latency?: boolean;
};

export class MockApiClient implements ApiClient {
  private tokenCounter = 1;
  private currentAccessToken = '';
  private accessTokenExpiry = 0;
  private account: Account = { ...INITIAL_ACCOUNT };

  private readonly getLatestPrice: NonNullable<MockApiOptions['getLatestPrice']>;
  private readonly random: () => number;
  private readonly latency: boolean;

  constructor(options: MockApiOptions = {}) {
    this.getLatestPrice = options.getLatestPrice ?? (() => undefined);
    this.random = options.random ?? Math.random;
    this.latency = options.latency ?? true;
  }

  /** Debug: make the current access token invalid, as if 60 s had passed. */
  forceExpire(): void {
    this.accessTokenExpiry = 0;
  }

  private wait(ms: number): Promise<void> {
    return this.latency ? delay(ms) : Promise.resolve();
  }

  private waitRandom(): Promise<void> {
    return this.latency ? randomDelay() : Promise.resolve();
  }

  private createAccessToken(): string {
    const token = `mock-access-${this.tokenCounter++}`;
    this.accessTokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
    this.currentAccessToken = token;
    return token;
  }

  private validateAccessToken(token: string): void {
    const valid =
      token === this.currentAccessToken && this.accessTokenExpiry > Date.now();
    if (!valid) {
      throw new ApiError('Access token expired', 401);
    }
  }

  async login(data: LoginRequest): Promise<Envelope<AuthTokens>> {
    await this.waitRandom();

    if (!data.email.trim() || data.password !== DEMO_PASSWORD) {
      throw new ApiError('Invalid email or password', 401);
    }

    return {
      success: true,
      message: 'Login successful',
      payload: {
        accessToken: this.createAccessToken(),
        refreshToken: `mock-refresh-${Date.now()}`,
      },
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<Envelope<{ accessToken: string }>> {
    await this.waitRandom();

    if (!refreshToken.startsWith('mock-refresh-')) {
      throw new ApiError('Refresh token expired', 401);
    }

    return {
      success: true,
      message: 'Token refreshed successfully',
      payload: { accessToken: this.createAccessToken() },
    };
  }

  async getAccount(accessToken: string): Promise<Envelope<Account>> {
    await this.waitRandom();
    this.validateAccessToken(accessToken);

    return {
      success: true,
      message: 'Account fetched successfully',
      payload: { ...this.account },
    };
  }

  async getSymbols(accessToken: string): Promise<Envelope<SymbolInfo[]>> {
    await this.waitRandom();
    this.validateAccessToken(accessToken);

    return {
      success: true,
      message: 'Symbols fetched successfully',
      payload: SYMBOLS,
    };
  }

  async placeTrade(
    accessToken: string,
    data: TradeRequest,
  ): Promise<Envelope<TradeResponse>> {
    await this.wait(1000);
    this.validateAccessToken(accessToken);

    // 1 in 5 orders is rejected.
    if (this.random() < 0.2) {
      throw new ApiError('Order rejected: price changed, please try again', 400);
    }

    const seed = SEED_PRICES.find(item => item.symbol === data.symbol);
    if (!seed) {
      throw new ApiError('Symbol not found', 404);
    }

    const live = this.getLatestPrice(data.symbol) ?? {
      bid: seed.bid,
      ask: seed.bid + seed.spread,
    };

    this.account = {
      ...this.account,
      equity: Number(
        (this.account.equity - data.volume * COMMISSION_PER_LOT).toFixed(2),
      ),
    };

    return {
      success: true,
      message: `${data.side} order placed successfully`,
      payload: {
        ticket: Math.floor(100000 + this.random() * 900000),
        openPrice: data.side === 'BUY' ? live.ask : live.bid,
        openTime: Math.floor(Date.now() / 1000),
      },
    };
  }
}