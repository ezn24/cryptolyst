import { D } from "@/lib/decimal";
import type { Asset } from "@prisma/client";
import type { PriceProvider, PriceQuote } from "./types";

export class CoinGeckoProvider implements PriceProvider {
  async getCurrentPrice(asset: Asset): Promise<PriceQuote> {
    const [quote] = await this.getCurrentPrices([asset]);
    return quote;
  }

  async getCurrentPrices(assets: Asset[]): Promise<PriceQuote[]> {
    const ids = assets.map((asset) => asset.coingeckoId).filter(Boolean).join(",");
    if (!ids) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?ids=${encodeURIComponent(ids)}&vs_currency=usd`;
      const response = await fetch(url, { signal: controller.signal, next: { revalidate: 60 } });
      if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
      const json = (await response.json()) as {
        id: string;
        current_price?: number;
        price_change_percentage_24h?: number;
        image?: string;
      }[];
      const rows = new Map(json.map((row) => [row.id, row]));
      return assets.flatMap((asset) => {
        if (!asset.coingeckoId) return [];
        const row = rows.get(asset.coingeckoId);
        if (row?.current_price == null) return [];
        return [{
          assetId: asset.id,
          price: D(row.current_price).toString(),
          currency: "USDT",
          source: "coingecko",
          change24h: D(row.price_change_percentage_24h ?? 0).toString(),
          iconUrl: row.image,
          timestamp: new Date(),
        }];
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
