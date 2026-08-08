import Decimal from "decimal.js";

export type LegacySaleValue = {
  slot: number;
  price: string;
  quantity: string;
  synthetic?: boolean;
};

export function normalizeLegacyAvailableStatus(input: {
  buyPrice: string;
  buyQuantity: string;
  sales: LegacySaleValue[];
  availableStatus: unknown;
}) {
  const buyQuantity = new Decimal(input.buyQuantity);
  const sales = input.sales.map((sale) => ({ ...sale }));
  const soldQuantity = sales.reduce(
    (sum, sale) => sum.plus(sale.quantity),
    new Decimal(0),
  );
  const rawRemaining = buyQuantity.minus(soldQuantity);
  const status = (() => {
    if (input.availableStatus === null || input.availableStatus === undefined || input.availableStatus === "") {
      return null;
    }
    try {
      return new Decimal(String(input.availableStatus)).toNumber();
    } catch {
      return null;
    }
  })();
  const forcedClosed = status === 0;
  let syntheticSale: LegacySaleValue | null = null;

  if (forcedClosed && rawRemaining.gt(0)) {
    syntheticSale = {
      slot: 6,
      price: sales.at(-1)?.price ?? input.buyPrice,
      quantity: rawRemaining.toString(),
      synthetic: true,
    };
    sales.push(syntheticSale);
  }

  const remainingQuantity = forcedClosed
    ? new Decimal(0)
    : Decimal.max(rawRemaining, 0);

  return {
    sales,
    forcedClosed,
    syntheticSale,
    rawRemaining,
    remainingQuantity,
  };
}
