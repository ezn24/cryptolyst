import { prisma } from "@/lib/db";
import { CoinGeckoProvider } from "@/lib/price-providers/coingecko";
import { BinanceProvider } from "@/lib/price-providers/binance";
import type { PriceQuote } from "@/lib/price-providers/types";

const globalForPriceUpdate = globalThis as typeof globalThis & {
  __cryptolystPriceUpdateRunning?: boolean;
};

if (globalForPriceUpdate.__cryptolystPriceUpdateRunning === undefined) {
  globalForPriceUpdate.__cryptolystPriceUpdateRunning = false;
}

function providerFor(source: string) {
  return source === "binance" ? new BinanceProvider() : new CoinGeckoProvider();
}

export async function updateAssetPrices(assetId?: string) {
  if (globalForPriceUpdate.__cryptolystPriceUpdateRunning) return { skipped: true, updated: 0 };
  globalForPriceUpdate.__cryptolystPriceUpdateRunning = true;
  try {
    const assets = await prisma.asset.findMany({
      where: { isActive: true, ...(assetId ? { id: assetId } : {}) },
    });
    const quotes: PriceQuote[] = [];
    for (const source of ["coingecko", "binance"]) {
      const group = assets.filter((asset) => asset.priceSource === source);
      if (!group.length) continue;
      try {
        quotes.push(...(await providerFor(source).getCurrentPrices(group)));
      } catch (error) {
        console.error("price update failed", source, error);
      }
    }

    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    await prisma.$transaction(async (tx) => {
      for (const quote of quotes) {
        await tx.asset.update({
          where: { id: quote.assetId },
          data: {
            currentPrice: quote.price,
            priceCurrency: quote.currency,
            priceSource: quote.source,
            priceChange24h: quote.change24h ?? "0",
            priceUpdatedAt: quote.timestamp,
            ...(!assetsById.get(quote.assetId)?.iconUrl && quote.iconUrl ? { iconUrl: quote.iconUrl } : {}),
          },
        });
        const hour = new Date(quote.timestamp);
        hour.setMinutes(0, 0, 0);
        await tx.priceHistory.upsert({
          where: {
            assetId_source_timestamp: {
              assetId: quote.assetId,
              source: quote.source,
              timestamp: hour,
            },
          },
          create: {
            assetId: quote.assetId,
            price: quote.price,
            currency: quote.currency,
            source: quote.source,
            timestamp: hour,
          },
          update: { price: quote.price, currency: quote.currency },
        });
      }
    });
    return { skipped: false, updated: quotes.length };
  } finally {
    globalForPriceUpdate.__cryptolystPriceUpdateRunning = false;
  }
}

export async function setManualPrice(assetId: string, price: string) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.update({
      where: { id: assetId },
      data: {
        currentPrice: price,
        priceSource: "manual",
        priceUpdatedAt: new Date(),
      },
    });
    await tx.priceHistory.create({
      data: { assetId, price, currency: "USDT", source: "manual" },
    });
    return asset;
  });
}

