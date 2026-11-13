
import type { PriceTick } from '../mocks/data';

export interface PriceFeed {
  connect(): void;
  disconnect(): void;

  subscribe(
    symbols: string[],
    onTicks: (ticks: PriceTick[]) => void,
  ): () => void;
}
