// import type { ApiClient } from './ApiClient';
// import { MockApiClient } from '../mocks/MockApiClient';

// // The only place that knows about the mock.
// // To use a real backend later, change this one line.
// export const apiClient: ApiClient = new MockApiClient();

import type { ApiClient } from './ApiClient';
import type { PriceFeed } from './PriceFeed';
import { MockApiClient } from '../mocks/MockApiClient';
import { MockPriceFeed } from '../mocks/MockPriceFeed';

// ---------------------------------------------------------------------------
// The ONLY place that knows about the mocks.
// To use a real backend later, replace these constructions.
// ---------------------------------------------------------------------------
const mockFeed = new MockPriceFeed();
const mockApi = new MockApiClient({
  // Lets the fake order endpoint fill at the live price.
  getLatestPrice: symbol => mockFeed.getLatest(symbol),
});

/** One shared feed for the whole app. */
export const priceFeed: PriceFeed = mockFeed;

export const apiClient: ApiClient = mockApi;

/** Debug helpers that only make sense with the mock backend. */
export const debugTools = {
  expireAccessToken: () => mockApi.forceExpire(),
};