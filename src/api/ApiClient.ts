
import type {
  Envelope,
  SymbolInfo,
} from '../mocks/data';

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type Account = {
  login: number;
  currency: string;
  balance: number;
  equity: number;
};

export type TradeSide = 'BUY' | 'SELL';

export type TradeRequest = {
  symbol: string;
  side: TradeSide;
  volume: number;
  sl?: number;
};

export type TradeResponse = {
  ticket: number;
  openPrice: number;
  openTime: number;
};

export interface ApiClient {
  login(data: LoginRequest): Promise<Envelope<AuthTokens>>;

  refreshToken(
    refreshToken: string,
  ): Promise<Envelope<{ accessToken: string }>>;

  getAccount(accessToken: string): Promise<Envelope<Account>>;

  getSymbols(accessToken: string): Promise<Envelope<SymbolInfo[]>>;

  placeTrade(
    accessToken: string,
    data: TradeRequest,
  ): Promise<Envelope<TradeResponse>>;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Returns the payload of a successful envelope, or throws the server message. */
export function unwrap<T>(envelope: Envelope<T>): T {
  if (!envelope.success) {
    throw new ApiError(envelope.message, 400);
  }
  return envelope.payload;
}
