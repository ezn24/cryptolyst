import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  await requireSession();
  const [assets, buyLots, sales, targets, priceHistory, settings] = await Promise.all([
    prisma.asset.findMany(),
    prisma.buyLot.findMany(),
    prisma.sale.findMany(),
    prisma.profitTarget.findMany(),
    prisma.priceHistory.findMany(),
    prisma.appSetting.findMany(),
  ]);
  return NextResponse.json(
    { formatVersion: 1, exportedAt: new Date().toISOString(), assets, buyLots, sales, targets, priceHistory, settings },
    { headers: { "content-disposition": `attachment; filename="cryptolyst-backup-${new Date().toISOString().slice(0, 10)}.json"` } },
  );
}
