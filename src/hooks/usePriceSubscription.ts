import { useEffect } from 'react';

import { priceFeed } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import { updatePrices } from '../store/priceSlice';
import { createTickBatcher } from '../utils/tickBatcher';

/**
 * Subscribes the calling screen to ONLY the symbols it shows, batching ticks
 * (latest per symbol, every 200 ms) before they reach Redux. Pass an empty
 * list (e.g. when the screen is not focused) to unsubscribe.
 */
export function usePriceSubscription(symbols: string[], batchMs = 200): void {
  const dispatch = useAppDispatch();
  const key = symbols.join(',');

  useEffect(() => {
    if (key === '') {
      return;
    }
    const batcher = createTickBatcher(
      ticks => dispatch(updatePrices(ticks)),
      batchMs,
    );
    const unsubscribe = priceFeed.subscribe(key.split(','), batcher.push);

    return () => {
      unsubscribe();
      batcher.dispose();
    };
  }, [key, batchMs, dispatch]);
}