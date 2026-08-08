import type { Asset } from "@prisma/client";

export type PriceQuote = {
  assetId: string;
  price: string;
  currency: string;
  source: string;
  change24h?: string;
  iconUrl?: string;
  timestamp: Date;
};

export interface PriceProvider {
  getCurrentPrice(asset: Asset): Promise<PriceQuote>;
  getCurrentPrices(assets: Asset[]): Promise<PriceQuote[]>;
}
