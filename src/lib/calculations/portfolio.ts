import { D, Decimal } from "@/lib/decimal";

export type SaleInput = {
  price: Decimal.Value;
  quantity: Decimal.Value;
  fee?: Decimal.Value | null;
};

export type BuyLotInput = {
  price: Decimal.Value;
  quantity: Decimal.Value;
  fee?: Decimal.Value | null;
  sales?: SaleInput[];
  currentPrice?: Decimal.Value | null;
  isIncluded?: boolean;
};

export function calculateBuyLotMetrics(lot: BuyLotInput) {
  const buyPrice = D(lot.price);
  const buyQuantity = D(lot.quantity);
  const buyFee = D(lot.fee);
  const currentPrice = D(lot.currentPrice);
  const sales = lot.sales ?? [];

  const grossBuyCost = buyPrice.mul(buyQuantity);
  const totalBuyCost = grossBuyCost.plus(buyFee);
  const effectiveUnitCost = buyQuantity.gt(0) ? totalBuyCost.div(buyQuantity) : D(0);
  const soldQuantity = sales.reduce((sum, sale) => sum.plus(D(sale.quantity)), D(0));
  const rawRemainingQuantity = buyQuantity.minus(soldQuantity);
  const remainingQuantity = Decimal.max(rawRemainingQuantity, D(0));
  const costBasisSoldQuantity = Decimal.min(soldQuantity, buyQuantity);
  const costOfSoldQuantity = effectiveUnitCost.mul(costBasisSoldQuantity);
  const remainingCost = effectiveUnitCost.mul(remainingQuantity);
  const totalNetSaleValue = sales.reduce(
    (sum, sale) => sum.plus(D(sale.price).mul(D(sale.quantity)).minus(D(sale.fee))),
    D(0),
  );
  const realizedProfit = totalNetSaleValue.minus(costOfSoldQuantity);
  const remainingMarketValue = remainingQuantity.mul(currentPrice);
  const unrealizedProfit = remainingMarketValue.minus(remainingCost);
  const totalProfit = realizedProfit.plus(unrealizedProfit);
  const unrealizedProfitPercent = remainingCost.gt(0) ? unrealizedProfit.div(remainingCost).mul(100) : D(0);
  const totalReturnPercent = totalBuyCost.gt(0) ? totalProfit.div(totalBuyCost).mul(100) : D(0);
  const status = lot.isIncluded === false
    ? "disabled"
    : remainingQuantity.lte(0)
      ? "closed"
      : soldQuantity.gt(0)
        ? "partial"
        : "open";

  return {
    grossBuyCost,
    totalBuyCost,
    effectiveUnitCost,
    soldQuantity,
    remainingQuantity,
    costOfSoldQuantity,
    remainingCost,
    totalNetSaleValue,
    realizedProfit,
    remainingMarketValue,
    unrealizedProfit,
    totalProfit,
    unrealizedProfitPercent,
    totalReturnPercent,
    status,
  };
}

export function calculateAssetMetrics(lots: BuyLotInput[]) {
  const metrics = lots.filter((lot) => lot.isIncluded !== false).map(calculateBuyLotMetrics);
  const totalPurchasedQuantity = lots.reduce((sum, lot) => sum.plus(D(lot.quantity)), D(0));
  const totalSoldQuantity = metrics.reduce((sum, lot) => sum.plus(lot.soldQuantity), D(0));
  const totalRemainingQuantity = metrics.reduce((sum, lot) => sum.plus(lot.remainingQuantity), D(0));
  const totalOriginalCost = metrics.reduce((sum, lot) => sum.plus(lot.totalBuyCost), D(0));
  const totalRemainingCost = metrics.reduce((sum, lot) => sum.plus(lot.remainingCost), D(0));
  const totalSaleProceeds = metrics.reduce((sum, lot) => sum.plus(lot.totalNetSaleValue), D(0));
  const realizedProfit = metrics.reduce((sum, lot) => sum.plus(lot.realizedProfit), D(0));
  const unrealizedProfit = metrics.reduce((sum, lot) => sum.plus(lot.unrealizedProfit), D(0));
  const totalProfit = realizedProfit.plus(unrealizedProfit);
  const currentMarketValue = metrics.reduce((sum, lot) => sum.plus(lot.remainingMarketValue), D(0));
  const averageEntryPrice = totalRemainingQuantity.gt(0) ? totalRemainingCost.div(totalRemainingQuantity) : D(0);
  const breakEvenRaw = totalRemainingQuantity.gt(0)
    ? totalOriginalCost.minus(totalSaleProceeds).div(totalRemainingQuantity)
    : D(0);
  const breakEvenPrice = Decimal.max(breakEvenRaw, D(0));
  const unrealizedProfitPercent = totalRemainingCost.gt(0) ? unrealizedProfit.div(totalRemainingCost).mul(100) : D(0);
  const totalReturnPercent = totalOriginalCost.gt(0) ? totalProfit.div(totalOriginalCost).mul(100) : D(0);

  return {
    totalPurchasedQuantity,
    totalSoldQuantity,
    totalRemainingQuantity,
    totalOriginalCost,
    totalRemainingCost,
    totalSaleProceeds,
    realizedProfit,
    unrealizedProfit,
    totalProfit,
    currentMarketValue,
    averageEntryPrice,
    breakEvenPrice,
    unrealizedProfitPercent,
    totalReturnPercent,
  };
}

export function calculatePortfolioMetrics(assets: { lots: BuyLotInput[] }[]) {
  const assetMetrics = assets.map((asset) => calculateAssetMetrics(asset.lots));
  const totalOriginalCost = assetMetrics.reduce((sum, asset) => sum.plus(asset.totalOriginalCost), D(0));
  const totalRemainingCost = assetMetrics.reduce((sum, asset) => sum.plus(asset.totalRemainingCost), D(0));
  const currentMarketValue = assetMetrics.reduce((sum, asset) => sum.plus(asset.currentMarketValue), D(0));
  const realizedProfit = assetMetrics.reduce((sum, asset) => sum.plus(asset.realizedProfit), D(0));
  const unrealizedProfit = assetMetrics.reduce((sum, asset) => sum.plus(asset.unrealizedProfit), D(0));
  const totalProfit = realizedProfit.plus(unrealizedProfit);
  const portfolioReturnPercent = totalOriginalCost.gt(0) ? totalProfit.div(totalOriginalCost).mul(100) : D(0);
  const openLotCount = assets.flatMap((asset) => asset.lots).filter((lot) => calculateBuyLotMetrics(lot).remainingQuantity.gt(0)).length;
  const closedLotCount = assets.flatMap((asset) => asset.lots).filter((lot) => calculateBuyLotMetrics(lot).remainingQuantity.isZero()).length;
  const holdingAssetCount = assetMetrics.filter((asset) => asset.totalRemainingQuantity.gt(0)).length;

  return {
    totalOriginalCost,
    totalRemainingCost,
    currentMarketValue,
    realizedProfit,
    unrealizedProfit,
    totalProfit,
    portfolioReturnPercent,
    holdingAssetCount,
    openLotCount,
    closedLotCount,
  };
}

export function calculateProfitTarget(input: {
  buyPrice: Decimal.Value;
  effectiveUnitCost: Decimal.Value;
  targetPercent?: Decimal.Value | null;
  targetPrice?: Decimal.Value | null;
  targetQuantity: Decimal.Value;
  currentPrice?: Decimal.Value | null;
}) {
  const buyPrice = D(input.buyPrice);
  const targetPrice = input.targetPrice ? D(input.targetPrice) : buyPrice.mul(D(1).plus(D(input.targetPercent).div(100)));
  const targetPercent = buyPrice.gt(0) ? targetPrice.div(buyPrice).minus(1).mul(100) : D(0);
  const targetQuantity = D(input.targetQuantity);
  const expectedProfit = targetPrice.minus(D(input.effectiveUnitCost)).mul(targetQuantity);
  const distancePercent = targetPrice.gt(0) ? targetPrice.minus(D(input.currentPrice)).div(targetPrice).mul(100) : D(0);
  const isReached = D(input.currentPrice).gte(targetPrice);

  return { targetPrice, targetPercent, targetQuantity, expectedProfit, distancePercent, isReached };
}



