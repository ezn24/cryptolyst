import { PrismaClient } from "@prisma/client";
import { calculateAssetMetrics } from "../src/lib/calculations/portfolio.ts";

const prisma = new PrismaClient();

try {
  const assets = await prisma.asset.findMany({
    include: { buyLots: { include: { sales: true } } },
    orderBy: { symbol: "asc" },
  });
  const result = assets.map((asset) => {
    const metrics = calculateAssetMetrics(
      asset.buyLots.map((lot) => ({ ...lot, currentPrice: asset.currentPrice })),
    );
    return {
      symbol: asset.symbol,
      currentPrice: asset.currentPrice.toString(),
      lots: asset.buyLots.length,
      sales: asset.buyLots.reduce((sum, lot) => sum + lot.sales.length, 0),
      purchased: metrics.totalPurchasedQuantity.toString(),
      remaining: metrics.totalRemainingQuantity.toString(),
      originalCost: metrics.totalOriginalCost.toString(),
      createdAt: asset.createdAt.toISOString(),
    };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
