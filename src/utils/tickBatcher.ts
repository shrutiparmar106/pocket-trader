import type { PriceTick } from '../mocks/data';

export type TickBatcher = {
  push: (ticks: PriceTick[]) => void;
  dispose: () => void;
};

/**
 * Collects incoming ticks and hands them over at most once per `intervalMs`,
 * keeping only the latest tick per symbol. This protects the UI from the
 * ~200 ticks/s the feed produces.
 */
export function createTickBatcher(
  onFlush: (ticks: PriceTick[]) => void,
  intervalMs = 200,
): TickBatcher {
  const pending = new Map<string, PriceTick>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (pending.size === 0) {
      return;
    }
    const ticks = Array.from(pending.values());
    pending.clear();
    onFlush(ticks);
  };

  return {
    push(ticks) {
      for (const tick of ticks) {
        pending.set(tick.symbol, tick);
      }
      if (!timer && pending.size > 0) {
        timer = setTimeout(flush, intervalMs);
      }
    },
    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending.clear();
    },
  };
}