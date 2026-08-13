import { prisma } from "@/lib/db";
import { calculateBuyLotMetrics } from "@/lib/calculations/portfolio";
import { D } from "@/lib/decimal";
import { assetConversionSchema } from "@/lib/validation/schemas";

export async function createAssetConversion(input: unknown) {
  const data = assetConversionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const [sourceAsset, targetAsset] = await Promise.all([
      tx.asset.findUnique({
        where: { id: data.sourceAssetId },
        include: {
          buyLots: {
            where: { isIncluded: true },
            include: { sales: true },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          },
        },
      }),
      tx.asset.findUnique({ where: { id: data.targetAssetId } }),
    ]);
    if (!sourceAsset) throw new Error("來源資產不存在");
    if (!targetAsset) throw new Error("目標資產不存在");

    const openLots = sourceAsset.buyLots.flatMap((lot) => {
      const metrics = calculateBuyLotMetrics({ ...lot, currentPrice: sourceAsset.currentPrice });
      return metrics.remainingQuantity.gt(0) ? [{ lot, metrics }] : [];
    });
    if (!openLots.length) throw new Error(`${sourceAsset.symbol} 沒有可轉換的剩餘持倉`);
    if (openLots.some(({ lot }) => lot.date > data.date)) {
      throw new Error("轉換日期不可早於來源持倉的買入日期");
    }

    const sourceQuantity = openLots.reduce(
      (sum, { metrics }) => sum.plus(metrics.remainingQuantity),
      D(0),
    );
    const transferredCost = openLots.reduce(
      (sum, { metrics }) => sum.plus(metrics.remainingCost),
      D(0),
    );
    const targetQuantity = D(data.targetQuantity);
    const destinationPrice = transferredCost.div(targetQuantity);
    const reference = `${sourceAsset.symbol} → ${targetAsset.symbol}`;

    const destinationLot = await tx.buyLot.create({
      data: {
        assetId: targetAsset.id,
        date: data.date,
        price: destinationPrice.toString(),
        quantity: targetQuantity.toString(),
        fee: D(data.fee).toString(),
        feeCurrency: data.feeCurrency,
        exchange: data.exchange || null,
        account: data.account || null,
        note: [
          `由資產轉換建立：${reference}`,
          data.note || null,
        ].filter(Boolean).join(" | "),
        isIncluded: true,
      },
    });

    const conversion = await tx.assetConversion.create({
      data: {
        sourceAssetId: sourceAsset.id,
        targetAssetId: targetAsset.id,
        destinationLotId: destinationLot.id,
        date: data.date,
        sourceQuantity: sourceQuantity.toString(),
        targetQuantity: targetQuantity.toString(),
        transferredCost: transferredCost.toString(),
        fee: D(data.fee).toString(),
        feeCurrency: data.feeCurrency,
        exchange: data.exchange || null,
        account: data.account || null,
        note: data.note || null,
      },
    });

    for (const { lot, metrics } of openLots) {
      await tx.sale.create({
        data: {
          buyLotId: lot.id,
          conversionId: conversion.id,
          date: data.date,
          price: metrics.effectiveUnitCost.toString(),
          quantity: metrics.remainingQuantity.toString(),
          fee: "0",
          feeCurrency: data.feeCurrency,
          exchange: data.exchange || null,
          account: data.account || null,
          note: `資產轉換：${reference}（成本轉移，不計轉換損益）`,
        },
      });
    }

    return {
      conversion,
      sourceAssetId: sourceAsset.id,
      targetAssetId: targetAsset.id,
      sourceSymbol: sourceAsset.symbol,
      targetSymbol: targetAsset.symbol,
    };
  }, { maxWait: 10_000, timeout: 60_000 });
}
