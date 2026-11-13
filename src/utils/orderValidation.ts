import type { TradeSide } from '../api/ApiClient';

export const MIN_VOLUME = 0.01;
export const MAX_VOLUME = 100;

export type OrderErrorCode =
  | 'NO_PRICE'
  | 'VOLUME_REQUIRED'
  | 'VOLUME_INVALID'
  | 'VOLUME_STEP'
  | 'VOLUME_RANGE'
  | 'SL_INVALID'
  | 'SL_BUY_ABOVE_BID'
  | 'SL_SELL_BELOW_ASK';

export type Quote = { bid: number; ask: number };

export type Result<T> = { ok: true; value: T } | { ok: false; code: OrderErrorCode };

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;
const normalize = (input: string) => input.trim().replace(',', '.');

/**
 * Volume must be 0.01–100 in steps of 0.01.
 * Works in integer hundredths to avoid float errors (0.1 + 0.2 !== 0.3).
 */
export function validateVolume(input: string): Result<number> {
  const text = normalize(input);
  if (text === '') {
    return { ok: false, code: 'VOLUME_REQUIRED' };
  }
  if (!NUMBER_PATTERN.test(text)) {
    return { ok: false, code: 'VOLUME_INVALID' };
  }

  const [whole, fraction = ''] = text.split('.');
  if (fraction.replace(/0+$/, '').length > 2) {
    return { ok: false, code: 'VOLUME_STEP' };
  }

  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
  if (hundredths < MIN_VOLUME * 100 || hundredths > MAX_VOLUME * 100) {
    return { ok: false, code: 'VOLUME_RANGE' };
  }
  return { ok: true, value: hundredths / 100 };
}

/**
 * Stop loss is optional (empty -> undefined).
 *   BUY : must be strictly below the bid
 *   SELL: must be strictly above the ask
 * Compared against the quote passed in, so callers must pass the LATEST price.
 * The value is rounded to the symbol's digits before comparing and sending.
 */
export function validateStopLoss(
  input: string,
  side: TradeSide,
  quote: Quote,
  digits: number,
): Result<number | undefined> {
  const text = normalize(input);
  if (text === '') {
    return { ok: true, value: undefined };
  }
  if (!NUMBER_PATTERN.test(text) || Number(text) <= 0) {
    return { ok: false, code: 'SL_INVALID' };
  }

  const sl = Number(Number(text).toFixed(digits));
  if (sl <= 0) {
    return { ok: false, code: 'SL_INVALID' };
  }
  if (side === 'BUY' && !(sl < quote.bid)) {
    return { ok: false, code: 'SL_BUY_ABOVE_BID' };
  }
  if (side === 'SELL' && !(sl > quote.ask)) {
    return { ok: false, code: 'SL_SELL_BELOW_ASK' };
  }
  return { ok: true, value: sl };
}

export type ValidOrder = { volume: number; sl?: number };

export function validateOrder(params: {
  side: TradeSide;
  volumeInput: string;
  stopLossInput: string;
  quote: Quote | undefined;
  digits: number;
}): Result<ValidOrder> {
  const { side, volumeInput, stopLossInput, quote, digits } = params;

  if (!quote) {
    return { ok: false, code: 'NO_PRICE' };
  }
  const volume = validateVolume(volumeInput);
  if (!volume.ok) {
    return volume;
  }
  const sl = validateStopLoss(stopLossInput, side, quote, digits);
  if (!sl.ok) {
    return sl;
  }
  return { ok: true, value: { volume: volume.value, sl: sl.value } };
}