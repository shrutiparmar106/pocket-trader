
// import type { PriceFeed } from '../api/PriceFeed';
// import {
//   SEED_PRICES,
//   type PriceTick,
// } from './data';

// type Listener = {
//   symbols: Set<string>;
//   callback: (ticks: PriceTick[]) => void;
// };

// export class MockPriceFeed implements PriceFeed {
//   private listeners = new Set<Listener>();

//   private prices = new Map(
//     SEED_PRICES.map(item => [
//       item.symbol,
//       { bid: item.bid, spread: item.spread },
//     ]),
//   );

//   private generationTimer: ReturnType<typeof setInterval> | null = null;

//   private batchTimer: ReturnType<typeof setInterval> | null = null;

//   private pendingTicks = new Map<string, PriceTick>();

//   private connected = false;

//   connect(): void {
//     if (this.connected) {
//       return;
//     }

//     this.connected = true;

//     // Generate approximately 200 ticks per second.
//     this.generationTimer = setInterval(() => {
//       for (let i = 0; i < 40; i++) {
//         this.generateTick();
//       }
//     }, 200);

//     // Deliver batched updates every 200 ms.
//     this.batchTimer = setInterval(() => {
//       this.flushTicks();
//     }, 200);
//   }

//   disconnect(): void {
//     if (this.generationTimer) {
//       clearInterval(this.generationTimer);
//       this.generationTimer = null;
//     }

//     if (this.batchTimer) {
//       clearInterval(this.batchTimer);
//       this.batchTimer = null;
//     }

//     this.pendingTicks.clear();
//     this.connected = false;
//   }

//   subscribe(
//     symbols: string[],
//     onTicks: (ticks: PriceTick[]) => void,
//   ): () => void {
//     const listener: Listener = {
//       symbols: new Set(symbols),
//       callback: onTicks,
//     };

//     this.listeners.add(listener);

//     return () => {
//       this.listeners.delete(listener);
//     };
//   }

//   private generateTick(): void {
//     const symbolList = SEED_PRICES;

//     const randomIndex = Math.floor(
//       Math.random() * symbolList.length,
//     );

//     const selected = symbolList[randomIndex];

//     const current = this.prices.get(selected.symbol);

//     if (!current) {
//       return;
//     }

//     // Random walk within the spread range.
//     const movement =
//       (Math.random() * 2 - 1) * selected.spread;

//     const bid = Math.max(0.00001, current.bid + movement);

//     const ask = bid + current.spread;

//     this.prices.set(selected.symbol, {
//       bid,
//       spread: selected.spread,
//     });

//     const tick: PriceTick = {
//       symbol: selected.symbol,
//       bid,
//       ask,
//       spread: selected.spread,
//       dateTime: Math.floor(Date.now() / 1000),
//     };

//     // Keep only the latest tick for each symbol.
//     this.pendingTicks.set(selected.symbol, tick);
//   }

//   private flushTicks(): void {
//     if (this.pendingTicks.size === 0) {
//       return;
//     }

//     const ticks = Array.from(this.pendingTicks.values());

//     this.pendingTicks.clear();

//     this.listeners.forEach(listener => {
//       const subscribedTicks = ticks.filter(tick =>
//         listener.symbols.has(tick.symbol),
//       );

//       if (subscribedTicks.length > 0) {
//         listener.callback(subscribedTicks);
//       }
//     });
//   }
// }
import type { PriceFeed } from '../api/PriceFeed';
import { SEED_PRICES, SYMBOLS, type PriceTick } from './data';

type Listener = {
  symbols: Set<string>;
  callback: (ticks: PriceTick[]) => void;
};

type WalkState = { bid: number; spread: number; digits: number };

// 20 ticks every 100 ms = ~200 ticks/s across all symbols.
const BURST_INTERVAL_MS = 100;
const TICKS_PER_BURST = 20;

const round = (value: number, digits: number) => Number(value.toFixed(digits));

/**
 * Fake WebSocket-like feed. Emits bursts of random-walk ticks. One burst may
 * contain the same symbol several times, like a real socket would, so the
 * consumer must keep only the latest tick per symbol.
 */
export class MockPriceFeed implements PriceFeed {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private walk = new Map<string, WalkState>();

  constructor() {
    const digitsBySymbol = new Map(SYMBOLS.map(s => [s.symbol, s.digits]));
    SEED_PRICES.forEach(seed => {
      const digits = digitsBySymbol.get(seed.symbol) ?? 5;
      this.walk.set(seed.symbol, {
        bid: round(seed.bid, digits),
        spread: seed.spread,
        digits,
      });
    });
  }

  connect(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => this.emitBurst(), BURST_INTERVAL_MS);
  }

  disconnect(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(
    symbols: string[],
    onTicks: (ticks: PriceTick[]) => void,
  ): () => void {
    const listener: Listener = { symbols: new Set(symbols), callback: onTicks };
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Mock-only helper so the fake order endpoint can fill at the live price. */
  getLatest(symbol: string): { bid: number; ask: number } | undefined {
    const state = this.walk.get(symbol);
    if (!state) {
      return undefined;
    }
    return {
      bid: state.bid,
      ask: round(state.bid + state.spread, state.digits),
    };
  }

  private emitBurst(): void {
    const symbols = SEED_PRICES;
    const ticks: PriceTick[] = [];

    for (let i = 0; i < TICKS_PER_BURST; i++) {
      const seed = symbols[Math.floor(Math.random() * symbols.length)];
      const state = this.walk.get(seed.symbol);
      if (!state) {
        continue;
      }

      // Random walk: move bid by a random amount within ±spread.
      const move = (Math.random() * 2 - 1) * state.spread;
      state.bid = round(Math.max(state.bid + move, state.spread), state.digits);
      const ask = round(state.bid + state.spread, state.digits);

      ticks.push({
        symbol: seed.symbol,
        bid: state.bid,
        ask,
        spread: round(ask - state.bid, state.digits),
        dateTime: Math.floor(Date.now() / 1000),
      });
    }

    this.listeners.forEach(listener => {
      const subscribed = ticks.filter(t => listener.symbols.has(t.symbol));
      if (subscribed.length > 0) {
        listener.callback(subscribed);
      }
    });
  }
}