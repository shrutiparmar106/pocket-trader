
// import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
// import type { PriceTick } from '../mocks/data';

// export type PriceDirection = 'up' | 'down' | 'unchanged';

// export type MarketPrice = PriceTick & {
//   direction: PriceDirection;
// };

// type PriceState = {
//   prices: Record<string, MarketPrice>;
// };

// const initialState: PriceState = {
//   prices: {},
// };

// const priceSlice = createSlice({
//   name: 'prices',
//   initialState,
//   reducers: {
//     updatePrices: (state, action: PayloadAction<PriceTick[]>) => {
//       action.payload.forEach(tick => {
//         const previous = state.prices[tick.symbol];

//         let direction: PriceDirection = 'unchanged';

//         if (previous) {
//           if (tick.bid > previous.bid) {
//             direction = 'up';
//           } else if (tick.bid < previous.bid) {
//             direction = 'down';
//           } else {
//             direction = previous.direction;
//           }
//         }

//         state.prices[tick.symbol] = {
//           ...tick,
//           direction,
//         };
//       });
//     },

//     clearPrices: state => {
//       state.prices = {};
//     },
//   },
// });

// export const { updatePrices, clearPrices } = priceSlice.actions;

// export default priceSlice.reducer;
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PriceTick } from '../mocks/data';
import type { RootState } from './index';

export type PriceDirection = 'up' | 'down' | 'unchanged';

export type MarketPrice = PriceTick & {
  direction: PriceDirection;
  /** Increments on every real change; rows use it to trigger the flash. */
  version: number;
};

type PriceState = { prices: Record<string, MarketPrice> };

const initialState: PriceState = { prices: {} };

const priceSlice = createSlice({
  name: 'prices',
  initialState,
  reducers: {
    updatePrices: (state, action: PayloadAction<PriceTick[]>) => {
      // Ticks are applied in order, so if one batch holds the same symbol
      // twice, the last one wins.
      for (const tick of action.payload) {
        const previous = state.prices[tick.symbol];

        // Unchanged price: keep the same object so subscribed rows don't re-render.
        if (previous && previous.bid === tick.bid && previous.ask === tick.ask) {
          continue;
        }

        let direction: PriceDirection = 'unchanged';
        if (previous) {
          if (tick.bid > previous.bid) {
            direction = 'up';
          } else if (tick.bid < previous.bid) {
            direction = 'down';
          } else {
            direction = previous.direction;
          }
        }

        state.prices[tick.symbol] = {
          ...tick,
          direction,
          version: (previous?.version ?? 0) + 1,
        };
      }
    },
    clearPrices: () => initialState,
  },
});

export const { updatePrices, clearPrices } = priceSlice.actions;

/** Per-symbol selector: a row re-renders only when ITS price changes. */
export const selectPrice = (symbol: string) => (state: RootState) =>
  state.prices.prices[symbol];

export default priceSlice.reducer;