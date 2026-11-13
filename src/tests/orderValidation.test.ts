import {
  validateOrder,
  validateStopLoss,
  validateVolume,
} from '../utils/orderValidation';

const quote = { bid: 1.08412, ask: 1.08425 };

describe('validateVolume', () => {
  it.each([
    ['0.01', 0.01],
    ['1', 1],
    ['0.1', 0.1],
    ['0.10', 0.1],
    ['2,5', 2.5], // decimal comma
    ['100', 100],
    ['99.99', 99.99],
    [' 1.25 ', 1.25],
  ])('accepts %s', (input, expected) => {
    expect(validateVolume(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['', 'VOLUME_REQUIRED'],
    ['   ', 'VOLUME_REQUIRED'],
    ['abc', 'VOLUME_INVALID'],
    ['-1', 'VOLUME_INVALID'],
    ['1.', 'VOLUME_INVALID'],
    ['1e2', 'VOLUME_INVALID'],
    ['0.001', 'VOLUME_STEP'],
    ['1.005', 'VOLUME_STEP'],
    ['0', 'VOLUME_RANGE'],
    ['0.00', 'VOLUME_RANGE'],
    ['100.01', 'VOLUME_RANGE'],
    ['101', 'VOLUME_RANGE'],
  ])('rejects "%s" with %s', (input, code) => {
    expect(validateVolume(input)).toEqual({ ok: false, code });
  });
});

describe('validateStopLoss', () => {
  it('treats an empty stop loss as "none"', () => {
    expect(validateStopLoss('', 'BUY', quote, 5)).toEqual({ ok: true, value: undefined });
  });

  describe('BUY: must be strictly below the bid', () => {
    it('accepts a value below the bid', () => {
      expect(validateStopLoss('1.08000', 'BUY', quote, 5)).toEqual({ ok: true, value: 1.08 });
    });
    it('rejects a value equal to the bid', () => {
      expect(validateStopLoss('1.08412', 'BUY', quote, 5)).toEqual({
        ok: false,
        code: 'SL_BUY_ABOVE_BID',
      });
    });
    it('rejects a value between bid and ask, and above the ask', () => {
      expect(validateStopLoss('1.08420', 'BUY', quote, 5).ok).toBe(false);
      expect(validateStopLoss('1.09', 'BUY', quote, 5).ok).toBe(false);
    });
  });

  describe('SELL: must be strictly above the ask', () => {
    it('accepts a value above the ask', () => {
      expect(validateStopLoss('1.09', 'SELL', quote, 5)).toEqual({ ok: true, value: 1.09 });
    });
    it('rejects a value equal to the ask', () => {
      expect(validateStopLoss('1.08425', 'SELL', quote, 5)).toEqual({
        ok: false,
        code: 'SL_SELL_BELOW_ASK',
      });
    });
    it('rejects a value between bid and ask, and below the bid', () => {
      expect(validateStopLoss('1.08420', 'SELL', quote, 5).ok).toBe(false);
      expect(validateStopLoss('1.0', 'SELL', quote, 5).ok).toBe(false);
    });
  });

  it('rejects non-numeric, zero and negative values', () => {
    for (const bad of ['abc', '0', '-1', '1.2.3']) {
      expect(validateStopLoss(bad, 'BUY', quote, 5)).toEqual({ ok: false, code: 'SL_INVALID' });
    }
  });

  it('rounds to the symbol digits before comparing', () => {
    // 1.084124 rounds to 1.08412 === bid -> not strictly below -> rejected
    expect(validateStopLoss('1.084124', 'BUY', quote, 5).ok).toBe(false);
    // 1.084116 rounds to 1.08412 as well
    expect(validateStopLoss('1.084116', 'BUY', quote, 5).ok).toBe(false);
    expect(validateStopLoss('1.08411', 'BUY', quote, 5)).toEqual({ ok: true, value: 1.08411 });
  });

  it('is checked against the quote it is given (the LATEST price)', () => {
    const oldQuote = { bid: 1.0, ask: 1.0001 };
    const newQuote = { bid: 1.05, ask: 1.0501 };
    expect(validateStopLoss('1.02', 'BUY', oldQuote, 5).ok).toBe(false);
    expect(validateStopLoss('1.02', 'BUY', newQuote, 5).ok).toBe(true);
  });
});

describe('validateOrder', () => {
  const base = { side: 'BUY' as const, volumeInput: '0.5', stopLossInput: '', quote, digits: 5 };

  it('accepts a valid order without a stop loss', () => {
    expect(validateOrder(base)).toEqual({ ok: true, value: { volume: 0.5, sl: undefined } });
  });

  it('accepts a valid order with a stop loss', () => {
    expect(validateOrder({ ...base, stopLossInput: '1.07' })).toEqual({
      ok: true,
      value: { volume: 0.5, sl: 1.07 },
    });
  });

  it('refuses to validate without a live price', () => {
    expect(validateOrder({ ...base, quote: undefined })).toEqual({
      ok: false,
      code: 'NO_PRICE',
    });
  });

  it('reports the volume error before the stop-loss error', () => {
    expect(validateOrder({ ...base, volumeInput: '0', stopLossInput: '9' })).toEqual({
      ok: false,
      code: 'VOLUME_RANGE',
    });
  });
});