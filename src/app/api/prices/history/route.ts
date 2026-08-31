import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { downsamplePricePoints, parsePriceRange, priceRangeStart, summarizePricePoints } from "@/lib/price-history";

export async function GET(request: NextRequest) {
  await requireSession();
  const assetId = request.nextUrl.searchParams.get("assetId");
  const range = parsePriceRange(request.nextUrl.searchParams.get("range"));
  if (!assetId) return NextResponse.json({ error: "缺少 assetId" }, { status: 400 });
  const start = priceRangeStart(range);
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true, symbol: true, name: true, color: true, currentPrice: true,
      priceCurrency: true, priceUpdatedAt: true,
      priceHistory: {
        where: start ? { timestamp: { gte: start } } : undefined,
        orderBy: { timestamp: "desc" }, take: 20_000,
        select: { timestamp: true, price: true, source: true },
      },
    },
  });
  if (!asset) return NextResponse.json({ error: "資產不存在" }, { status: 404 });
  const rawPoints = asset.priceHistory.reverse().map((point) => ({
    timestamp: point.timestamp.getTime(), price: point.price.toNumber(), source: point.source,
  }));
  if (start) {
    const anchor = await prisma.priceHistory.findFirst({
      where: { assetId, timestamp: { lt: start } },
      orderBy: { timestamp: "desc" },
      select: { price: true, source: true },
    });
    if (anchor) {
      rawPoints.unshift({ timestamp: start.getTime(), price: anchor.price.toNumber(), source: anchor.source });
    }
  }
  if (asset.priceUpdatedAt && asset.currentPrice.gt(0)) {
    const current = { timestamp: asset.priceUpdatedAt.getTime(), price: asset.currentPrice.toNumber(), source: "current" };
    const previous = rawPoints.at(-1);
    if (!previous || previous.timestamp < current.timestamp) rawPoints.push(current);
    else if (previous.timestamp === current.timestamp) rawPoints[rawPoints.length - 1] = current;
  }
  return NextResponse.json({
    asset: { id: asset.id, symbol: asset.symbol, name: asset.name, color: asset.color, currency: asset.priceCurrency },
    range, pointCount: rawPoints.length,
    coverage: rawPoints.length ? { from: new Date(rawPoints[0].timestamp).toISOString(), to: new Date(rawPoints.at(-1)!.timestamp).toISOString() } : null,
    summary: summarizePricePoints(rawPoints),
    points: downsamplePricePoints(rawPoints).map((point) => ({ ...point, timestamp: new Date(point.timestamp).toISOString() })),
  });
}
