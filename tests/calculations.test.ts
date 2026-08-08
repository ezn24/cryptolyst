import { describe, expect, it } from "vitest";
import { calculateBuyLotMetrics } from "@/lib/calculations/portfolio";

describe("calculateBuyLotMetrics", () => {
  it("calculates unsold lots", () => {
    const metrics = calculateBuyLotMetrics({ price: "100", quantity: "2", fee: "4", currentPrice: "130" });
    expect(metrics.remainingQuantity.toString()).toBe("2");
    expect(metrics.remainingCost.toString()).toBe("204");
    expect(metrics.unrealizedProfit.toString()).toBe("56");
  });

  it("calculates partial sales with fees", () => {
    const metrics = calculateBuyLotMetrics({
      price: "100",
      quantity: "2",
      fee: "4",
      currentPrice: "120",
      sales: [{ price: "150", quantity: "0.5", fee: "1" }],
    });
    expect(metrics.soldQuantity.toString()).toBe("0.5");
    expect(metrics.realizedProfit.toString()).toBe("23");
    expect(metrics.remainingCost.toString()).toBe("153");
  });

  it("zeros remaining values for fully sold lots", () => {
    const metrics = calculateBuyLotMetrics({
      price: "100",
      quantity: "1",
      fee: "0",
      currentPrice: "200",
      sales: [{ price: "110", quantity: "1", fee: "0" }],
    });
    expect(metrics.remainingQuantity.toString()).toBe("0");
    expect(metrics.remainingCost.toString()).toBe("0");
    expect(metrics.unrealizedProfit.toString()).toBe("0");
    expect(metrics.realizedProfit.toString()).toBe("10");
  });

  it("keeps high precision decimal values", () => {
    const metrics = calculateBuyLotMetrics({ price: "0.123456789123", quantity: "1000.00000001", fee: "0.00000001", currentPrice: "0.223456789123" });
    expect(metrics.remainingQuantity.toString()).toBe("1000.00000001");
    expect(metrics.unrealizedProfit.gt("99.999999")).toBe(true);
  });

  it("does not treat negative oversold quantity as a remaining holding", () => {
    const metrics = calculateBuyLotMetrics({
      price: "57590",
      quantity: "0.00249",
      currentPrice: "65294.23",
      sales: [{ price: "74333.33", quantity: "0.0025", fee: "0" }],
    });
    expect(metrics.soldQuantity.toString()).toBe("0.0025");
    expect(metrics.remainingQuantity.toString()).toBe("0");
    expect(metrics.remainingCost.toString()).toBe("0");
    expect(metrics.remainingMarketValue.toString()).toBe("0");
    expect(metrics.unrealizedProfit.toString()).toBe("0");
    expect(metrics.costOfSoldQuantity.toString()).toBe("143.3991");
    expect(metrics.status).toBe("closed");
  });
});


