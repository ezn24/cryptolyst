import { calculateAssetMetrics, type BuyLotInput, type SaleInput } from "@/lib/calculations/portfolio";
import { D, type Decimal } from "@/lib/decimal";

export type HistoricalAsset = {
  id: string;
  symbol: string;
  color: string;
  lots: (Omit<BuyLotInput, "sales"> & { date: Date; sales: (SaleInput & { date: Date })[] })[];
  prices: { timestamp: Date; price: Decimal.Value }[];
};

export function holdingStatusRank(status: string) {
  return ({ open: 0, partial: 1, closed: 2, disabled: 3 } as Record<string, number>)[status] ?? 4;
}

export function snapshotAt(asset: HistoricalAsset, timestamp: number) {
  // Never use a future quote or today's quantity to value an earlier holding.
  let low = 0;
  let high = asset.prices.length - 1;
  let price: Decimal | null = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (asset.prices[middle].timestamp.getTime() <= timestamp) {
      price = D(asset.prices[middle].price);
      low = middle + 1;
    } else high = middle - 1;
  }
  const metrics = calculateAssetMetrics(asset.lots
    .filter((lot) => lot.date.getTime() <= timestamp)
    .map((lot) => ({ ...lot, sales: lot.sales.filter((sale) => sale.date.getTime() <= timestamp), currentPrice: price })));
  return { metrics, price, valued: metrics.totalRemainingQuantity.isZero() || price !== null };
}

export function createPeriodReport(assets: HistoricalAsset[], from: Date, to: Date, all = false) {
  const start = from.getTime();
  const end = to.getTime();
  const rows = assets.map((asset) => {
    const before = snapshotAt(asset, start);
    const after = snapshotAt(asset, end);
    const referencePrice = all ? asset.prices.find((point) => point.timestamp.getTime() <= end)?.price : before.price;
    const priceChange = referencePrice != null && D(referencePrice).gt(0) && after.price !== null
      ? after.price.div(referencePrice).minus(1).mul(100) : null;
    const realized = after.metrics.realizedProfit.minus(before.metrics.realizedProfit);
    const unrealized = before.valued && after.valued
      ? after.metrics.unrealizedProfit.minus(before.metrics.unrealizedProfit) : null;
    return { id: asset.id, before, after, priceChange, realized, unrealized, profit: unrealized?.plus(realized) ?? null };
  });
  // Uniform samples plus transaction boundaries retain cash-flow steps without shipping every quote.
  const timestamps = new Set<number>(Array.from({ length: 121 }, (_, index) => Math.round(start + (end - start) * index / 120)));
  for (const asset of assets) {
    for (const lot of asset.lots) {
      for (const date of [lot.date, ...lot.sales.map((sale) => sale.date)]) {
        const time = date.getTime();
        if (time > start && time <= end) { timestamps.add(time - 1); timestamps.add(time); }
      }
    }
  }
  const history = [...timestamps].sort((a, b) => a - b).map((timestamp) => {
    const row: { time: string; total: number | null } & Record<string, string | number | null> = {
      time: new Date(timestamp).toISOString(), total: 0,
    };
    let total = D(0);
    let complete = true;
    for (const asset of assets) {
      const snapshot = snapshotAt(asset, timestamp);
      row[asset.id] = snapshot.valued ? snapshot.metrics.currentMarketValue.toNumber() : null;
      if (!snapshot.valued) complete = false;
      total = total.plus(snapshot.metrics.currentMarketValue);
    }
    row.total = complete ? total.toNumber() : null;
    return row;
  });
  return { rows, history, from, to, incomplete: rows.some((row) => !row.before.valued || !row.after.valued) };
}
