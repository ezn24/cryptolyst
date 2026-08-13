import { prisma } from "@/lib/db";
import {
  calculateAssetMetrics,
  calculateBuyLotMetrics,
  calculatePortfolioMetrics,
} from "@/lib/calculations/portfolio";

export async function getPortfolioData() {
  const [assets, settings, conversionCost] = await Promise.all([
    prisma.asset.findMany({
      orderBy: [{ sortOrder: "asc" }, { symbol: "asc" }],
      include: {
        buyLots: {
          orderBy: { date: "desc" },
          include: { sales: { orderBy: { date: "asc" } }, targets: true },
        },
        priceHistory: { orderBy: { timestamp: "asc" }, take: 500 },
      },
    }),
    getSettings(),
    prisma.assetConversion.aggregate({ _sum: { transferredCost: true } }),
  ]);

  const summaries = assets.map((asset) => {
    const lots = asset.buyLots.map((lot) => ({
      ...lot,
      currentPrice: asset.currentPrice,
    }));
    const metrics = calculateAssetMetrics(lots);
    return { asset, lots, metrics };
  });

  const portfolio = calculatePortfolioMetrics(
    summaries.map((summary) => ({
      lots: summary.lots.map((lot) => ({ ...lot, currentPrice: summary.asset.currentPrice })),
    })),
    conversionCost._sum.transferredCost ?? 0,
  );

  return { assets: summaries, portfolio, settings };
}

export async function getAssetDetail(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      buyLots: {
        orderBy: [{ date: "desc" }, { createdAt: "asc" }],
        include: {
          sales: { orderBy: { date: "asc" } },
          targets: { orderBy: { targetPercent: "asc" } },
          destinationConversion: { select: { id: true } },
        },
      },
      priceHistory: { orderBy: { timestamp: "asc" }, take: 500 },
    },
  });
  if (!asset) return null;
  const lots = asset.buyLots.map((lot) => ({
    ...lot,
    metrics: calculateBuyLotMetrics({ ...lot, currentPrice: asset.currentPrice }),
  }));
  const metrics = calculateAssetMetrics(asset.buyLots.map((lot) => ({ ...lot, currentPrice: asset.currentPrice })));
  return { asset, lots, metrics };
}

export async function getSettings() {
  return prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}
