import { D } from "@/lib/decimal";
import type { Asset } from "@prisma/client";
import type { PriceProvider, PriceQuote } from "./types";

export class BinanceProvider implements PriceProvider {
  async getCurrentPrice(asset: Asset): Promise<PriceQuote> {
    const [quote] = await this.getCurrentPrices([asset]);
    return quote;
  }

  async getCurrentPrices(assets: Asset[]): Promise<PriceQuote[]> {
    const quotes: PriceQuote[] = [];
    for (const asset of assets) {
      if (!asset.binanceSymbol) continue;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${asset.binanceSymbol}`, {
          signal: controller.signal,
          next: { revalidate: 60 },
        });
        if (!response.ok) throw new Error(`Binance ${response.status}`);
        const json = (await response.json()) as { lastPrice: string; priceChangePercent?: string };
        quotes.push({
          assetId: asset.id,
          price: D(json.lastPrice).toString(),
          currency: "USDT",
          source: "binance",
          change24h: D(json.priceChangePercent ?? 0).toString(),
          timestamp: new Date(),
        });
      } finally {
        clearTimeout(timer);
      }
    }
    return quotes;
  }
}
