# Pocket Trader

React Native take-home: sign-in, live price list, market order form. Frontend only,
all data comes from an in-app mock layer.

**Stack:** <!-- TODO: bare React Native 0.xx (CLI) OR Expo (dev build) — pick one --> ·
TypeScript (strict) · Redux Toolkit · React Navigation · react-native-keychain ·
i18next / react-i18next

## Run it

```bash
yarn install            # or npm install
cd ios && pod install && cd ..   # iOS only
yarn ios                # or: yarn android
yarn test               # unit tests
```

Login: any email + password `Demo@1234`.

Demo helpers on Market Watch: **Burst (3 calls)** fires 3 authenticated requests at
once; **Expire token** makes the access token invalid immediately (instead of waiting
60 s). Press *Expire token*, then *Burst*: all 3 calls get a 401 and the alert reports
exactly one refresh call.

## Architecture

```
src/
  api/        ApiClient + PriceFeed interfaces; client.ts is the only file that
              imports the mocks (swap it for a real backend)
  mocks/      MockApiClient, MockPriceFeed, static data
  services/   AuthService (tokens, refresh, retry), TokenStorage (Keychain)
  store/      Redux slices: auth (signed in or not), account, prices
  hooks/      usePriceSubscription
  utils/      orderValidation (pure), tickBatcher (pure), format
  components/ PriceRow, AccountBar
  screens/    Login, MarketWatch, Order
  locales/    en.json, hi.json
  tests/
```

**UI vs data layer.** Screens and state only see the `ApiClient` / `PriceFeed`
interfaces. Every authenticated call goes through `authService.requestWithAuth`.

**Tokens.** `AuthService` is the single owner of the tokens; Redux only holds
`isAuthenticated`. Tokens are saved in Keychain/Keystore, never AsyncStorage. On a 401:
one refresh, one retry. Concurrent 401s share one in-flight refresh promise. A request
that failed with a token that was already replaced is retried with the new token
without a second refresh. If the refresh is rejected (401) the session ends and the
UI returns to Login; a plain network error does not sign the user out. On cold start
the session is restored from Keychain and the access token renewed.

**Live prices.** One shared `PriceFeed`, connected while signed in. Each screen
subscribes only to the symbols it shows (Market Watch: the filtered list, and nothing
while another screen is focused; Order: its one symbol). Ticks are collected in a
batcher (latest tick per symbol, flushed every 200 ms) before one Redux dispatch. The
reducer ignores ticks that don't change the price. Each `PriceRow` is memoized and
selects only its own symbol, so a tick re-renders one row, not the list. The
green/red flash animates the opacity of an overlay on the native driver.

**Orders.** Validation is a pure function (`orderValidation.ts`) run against the
latest price read from the store at tap time. Buy: SL < bid. Sell: SL > ask. Volume is
checked in integer hundredths to avoid float errors. A ref plus disabled buttons
prevent double-submit. After success, `GET /accounts/me` is refetched.

## Assumptions

- Language follows the device (English or Hindi); there is no switcher.
- Mock orders fill at the live price and deduct a fake $7/lot commission from equity,
  so the account bar visibly changes.
- Mock feed prices are rounded to each symbol's `digits`, so what the user sees is
  what validation compares against.

## AI assistance

<!-- TODO: be specific. e.g. "Used Claude to review my first draft, and to write
the order screen, tests and locale files. I read and understand all of it." -->

## With more time

- Unsubscribe only for rows not on screen (viewability-based subscription).
- Pause the feed when the app is backgrounded.
- Component tests for PriceRow / OrderScreen; an e2e happy path.
- Real language switcher and number/date localisation.
- Order confirmation step and idempotency key on the order request.
