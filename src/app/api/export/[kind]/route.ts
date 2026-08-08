import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPortfolioData } from "@/lib/services/portfolio-service";
import { decimalString } from "@/lib/decimal";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireSession();
  const { kind } = await params;
  const assetId = new URL(request.url).searchParams.get("asset") || undefined;
  let rows: Record<string, unknown>[] = [];
  let filenameSuffix = kind;

  if (kind === "assets") {
    rows = (await prisma.asset.findMany()).map((asset) => ({
      ...asset,
      currentPrice: decimalString(asset.currentPrice),
    }));
  } else if (kind === "buy-lots") {
    rows = (
      await prisma.buyLot.findMany({
        where: assetId ? { assetId } : undefined,
        include: { asset: true },
      })
    ).map((lot) => ({
      asset: lot.asset.symbol,
      date: lot.date.toISOString(),
      price: decimalString(lot.price),
      quantity: decimalString(lot.quantity),
      fee: decimalString(lot.fee),
      exchange: lot.exchange,
      account: lot.account,
      note: lot.note,
    }));
  } else if (kind === "sales") {
    rows = (
      await prisma.sale.findMany({
        where: assetId ? { buyLot: { assetId } } : undefined,
        include: { buyLot: { include: { asset: true } } },
      })
    ).map((sale) => ({
      asset: sale.buyLot.asset.symbol,
      buyLotId: sale.buyLotId,
      date: sale.date.toISOString(),
      price: decimalString(sale.price),
      quantity: decimalString(sale.quantity),
      fee: decimalString(sale.fee),
      exchange: sale.exchange,
      account: sale.account,
      note: sale.note,
    }));
  } else if (kind === "transactions") {
    const [lots, sales, selectedAsset] = await Promise.all([
      prisma.buyLot.findMany({
        where: assetId ? { assetId } : undefined,
        include: { asset: true },
      }),
      prisma.sale.findMany({
        where: assetId ? { buyLot: { assetId } } : undefined,
        include: { buyLot: { include: { asset: true } } },
      }),
      assetId ? prisma.asset.findUnique({ where: { id: assetId } }) : null,
    ]);
    rows = [
      ...lots.map((lot) => ({
        type: "BUY",
        asset: lot.asset.symbol,
        date: lot.date.toISOString(),
        price: decimalString(lot.price),
        quantity: decimalString(lot.quantity),
        fee: decimalString(lot.fee),
        feeCurrency: lot.feeCurrency,
        exchange: lot.exchange,
        account: lot.account,
        buyLotReference: lot.id,
        note: lot.note,
      })),
      ...sales.map((sale) => ({
        type: "SELL",
        asset: sale.buyLot.asset.symbol,
        date: sale.date.toISOString(),
        price: decimalString(sale.price),
        quantity: decimalString(sale.quantity),
        fee: decimalString(sale.fee),
        feeCurrency: sale.feeCurrency,
        exchange: sale.exchange,
        account: sale.account,
        buyLotReference: sale.buyLotId,
        note: sale.note,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    if (selectedAsset) filenameSuffix = `${selectedAsset.symbol.toLowerCase()}-transactions`;
  } else if (kind === "portfolio") {
    const data = await getPortfolioData();
    rows = data.assets.map(({ asset, metrics }) => ({
      asset: asset.symbol,
      totalRemainingQuantity: decimalString(metrics.totalRemainingQuantity),
      totalRemainingCost: decimalString(metrics.totalRemainingCost),
      currentMarketValue: decimalString(metrics.currentMarketValue),
      realizedProfit: decimalString(metrics.realizedProfit),
      unrealizedProfit: decimalString(metrics.unrealizedProfit),
      totalProfit: decimalString(metrics.totalProfit),
      totalReturnPercent: decimalString(metrics.totalReturnPercent),
    }));
  } else {
    return NextResponse.json({ error: "unknown export" }, { status: 404 });
  }

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cryptolyst-${filenameSuffix}.csv"`,
    },
  });
}
