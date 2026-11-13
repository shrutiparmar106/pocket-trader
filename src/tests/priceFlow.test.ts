import type { PriceTick } from '../mocks/data';
import priceReducer, { updatePrices } from '../store/priceSlice';
import { createTickBatcher } from '../utils/tickBatcher';

const tick = (symbol: string, bid: number, spread = 0.0001): PriceTick => ({
  symbol,
  bid,
  ask: Number((bid + spread).toFixed(5)),
  spread,
  dateTime: 1,
});

describe('priceSlice', () => {
  it('keeps only the latest tick when one batch holds a symbol twice', () => {
    const state = priceReducer(
      undefined,
      updatePrices([tick('EURUSD', 1.1), tick('EURUSD', 1.2)]),
    );
    expect(state.prices.EURUSD.bid).toBe(1.2);
  });

  it('flags direction up/down against the previous bid', () => {
    let state = priceReducer(undefined, updatePrices([tick('EURUSD', 1.1)]));
    expect(state.prices.EURUSD.direction).toBe('unchanged');
    state = priceReducer(state, updatePrices([tick('EURUSD', 1.2)]));
    expect(state.prices.EURUSD.direction).toBe('up');
    state = priceReducer(state, updatePrices([tick('EURUSD', 1.15)]));
    expect(state.prices.EURUSD.direction).toBe('down');
  });

  it('keeps the same object for an identical price (no needless re-render)', () => {
    const first = priceReducer(undefined, updatePrices([tick('EURUSD', 1.1)]));
    const second = priceReducer(first, updatePrices([tick('EURUSD', 1.1)]));
    expect(second.prices.EURUSD).toBe(first.prices.EURUSD);
  });
});

describe('createTickBatcher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('flushes once per interval with the latest tick per symbol', () => {
    const onFlush = jest.fn();
    const batcher = createTickBatcher(onFlush, 200);

    batcher.push([tick('A', 1), tick('B', 5)]);
    batcher.push([tick('A', 2)]);
    expect(onFlush).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);

    expect(onFlush).toHaveBeenCalledTimes(1);
    const flushed: PriceTick[] = onFlush.mock.calls[0][0];
    expect(flushed).toHaveLength(2);
    expect(flushed.find(t => t.symbol === 'A')?.bid).toBe(2);
  });

  it('does nothing after dispose', () => {
    const onFlush = jest.fn();
    const batcher = createTickBatcher(onFlush, 200);
    batcher.push([tick('A', 1)]);
    batcher.dispose();
    jest.advanceTimersByTime(1000);
    expect(onFlush).not.toHaveBeenCalled();
  });
});