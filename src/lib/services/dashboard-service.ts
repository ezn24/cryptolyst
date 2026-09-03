import { prisma } from "@/lib/db";
import { createPeriodReport } from "@/lib/portfolio-history";
import { priceRangeStart, type PriceRange } from "@/lib/price-history";
import type { getPortfolioData } from "@/lib/services/portfolio-service";

export async function getDashboardReport(summaries: Awaited<ReturnType<typeof getPortfolioData>>["assets"], range: PriceRange, now = new Date()) {
  let from = priceRangeStart(range, now);
  if (!from) {
    const firstQuote = await prisma.priceHistory.aggregate({ _min: { timestamp: true }, where: { timestamp: { lte: now } } });
    const dates = summaries.flatMap(({ asset }) => asset.buyLots.map((lot) => lot.date.getTime())).filter((date) => date <= now.getTime());
    if (firstQuote._min.timestamp) dates.push(firstQuote._min.timestamp.getTime());
    from = new Date(dates.length ? Math.min(...dates) - 1 : now.getTime());
  }
  const start = from;
  const assets = await Promise.all(summaries.map(async ({ asset }) => {
    const [prices, anchor] = await Promise.all([
      prisma.priceHistory.findMany({
        where: { assetId: asset.id, timestamp: { gte: start, lte: now } },
        orderBy: { timestamp: "asc" }, select: { timestamp: true, price: true },
      }),
      prisma.priceHistory.findFirst({
        where: { assetId: asset.id, timestamp: { lt: start } },
        orderBy: { timestamp: "desc" }, select: { timestamp: true, price: true },
      }),
    ]);
    if (anchor) prices.unshift(anchor);
    if (asset.priceUpdatedAt && asset.priceUpdatedAt <= now && asset.currentPrice.gt(0)) {
      prices.push({ timestamp: asset.priceUpdatedAt, price: asset.currentPrice });
      prices.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return { id: asset.id, symbol: asset.symbol, color: asset.color, lots: asset.buyLots, prices };
  }));
  return createPeriodReport(assets, start, now, range === "ALL");
}
