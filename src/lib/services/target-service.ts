import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { calculateBuyLotMetrics, calculateProfitTarget } from "@/lib/calculations/portfolio";
import { targetSchema } from "@/lib/validation/schemas";

async function targetData(input: unknown) {
  const data = targetSchema.parse(input);
  const lot = await prisma.buyLot.findUnique({
    where: { id: data.buyLotId },
    include: { sales: true, asset: true },
  });
  if (!lot) throw new Error("買入批次不存在");

  const metrics = calculateBuyLotMetrics({ ...lot, currentPrice: lot.asset.currentPrice });
  if (D(data.targetQuantity).gt(metrics.remainingQuantity)) {
    throw new Error("目標數量不可超過批次剩餘數量");
  }

  const calc = calculateProfitTarget({
    buyPrice: lot.price,
    effectiveUnitCost: metrics.effectiveUnitCost,
    targetPercent: data.targetPercent || null,
    targetPrice: data.targetPrice || null,
    targetQuantity: data.targetQuantity,
    currentPrice: lot.asset.currentPrice,
  });

  return {
    lot,
    data: {
      buyLotId: data.buyLotId,
      targetPercent: calc.targetPercent.toString(),
      targetPrice: calc.targetPrice.toString(),
      targetQuantity: calc.targetQuantity.toString(),
      isReached: calc.isReached,
      reachedAt: calc.isReached ? new Date() : null,
      note: data.note || null,
    },
  };
}

export async function createProfitTarget(input: unknown) {
  const prepared = await targetData(input);
  const target = await prisma.profitTarget.create({ data: prepared.data });
  revalidatePath("/");
  return { target, assetId: prepared.lot.assetId };
}

export async function updateProfitTarget(id: string, input: unknown) {
  const prepared = await targetData(input);
  const target = await prisma.profitTarget.update({
    where: { id },
    data: prepared.data,
  });
  revalidatePath("/");
  return { target, assetId: prepared.lot.assetId };
}

export async function deleteProfitTarget(id: string) {
  const existing = await prisma.profitTarget.findUnique({
    where: { id },
    include: { buyLot: true },
  });
  if (!existing) throw new Error("止盈目標不存在");
  const target = await prisma.profitTarget.delete({ where: { id } });
  revalidatePath("/");
  return { target, assetId: existing.buyLot.assetId };
}

export async function refreshReachedTargets() {
  const targets = await prisma.profitTarget.findMany({
    include: { buyLot: { include: { asset: true } } },
  });
  for (const target of targets) {
    const reached = D(target.buyLot.asset.currentPrice).gte(D(target.targetPrice));
    if (reached && !target.isReached) {
      await prisma.profitTarget.update({
        where: { id: target.id },
        data: { isReached: true, reachedAt: new Date() },
      });
    }
  }
}
