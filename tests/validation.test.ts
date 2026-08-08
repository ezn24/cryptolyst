import { describe, expect, it } from "vitest";
import { calculateProfitTarget } from "@/lib/calculations/portfolio";
import { assetSchema, buyLotSchema, saleSchema, targetSchema } from "@/lib/validation/schemas";

describe("transaction validation", () => {
  it("normalizes valid asset colors and rejects malformed values", () => {
    const input = {
      symbol: "btc",
      name: "Bitcoin",
      priceSource: "coingecko" as const,
      currentPrice: "1",
      iconUrl: "",
      color: "#f2a900",
      isActive: true,
    };
    expect(assetSchema.parse(input).color).toBe("#F2A900");
    expect(() => assetSchema.parse({ ...input, color: "yellow" })).toThrow();
  });

  it("accepts high precision buy data without converting through number", () => {
    const value = buyLotSchema.parse({
      assetId: "asset-1",
      date: "2026-07-27",
      price: "0.123456789123456789",
      quantity: "123456.123456789",
      fee: "0.00000001",
      feeCurrency: "USDT",
      exchange: "",
      account: "",
      note: "",
      isIncluded: true,
    });
    expect(value.price).toBe("0.123456789123456789");
    expect(value.quantity).toBe("123456.123456789");
  });

  it("rejects zero sale quantity and negative fees", () => {
    const base = {
      buyLotId: "lot-1",
      date: "2026-07-27",
      price: "100",
      feeCurrency: "USDT",
      exchange: "",
      account: "",
      note: "",
    };
    expect(() => saleSchema.parse({ ...base, quantity: "0", fee: "0" })).toThrow();
    expect(() => saleSchema.parse({ ...base, quantity: "1", fee: "-1" })).toThrow();
  });

  it("accepts either target percent or target price", () => {
    expect(
      targetSchema.parse({
        buyLotId: "lot-1",
        targetPercent: "20",
        targetPrice: "",
        targetQuantity: "1",
        note: "",
      }).targetPercent,
    ).toBe("20");
    expect(
      targetSchema.parse({
        buyLotId: "lot-1",
        targetPercent: "",
        targetPrice: "120",
        targetQuantity: "1",
        note: "",
      }).targetPrice,
    ).toBe("120");
  });
});

describe("profit target calculation", () => {
  it("derives price from percent and percent from price", () => {
    const fromPercent = calculateProfitTarget({
      buyPrice: "100",
      effectiveUnitCost: "102",
      targetPercent: "20",
      targetQuantity: "1",
      currentPrice: "110",
    });
    expect(fromPercent.targetPrice.toString()).toBe("120");

    const fromPrice = calculateProfitTarget({
      buyPrice: "100",
      effectiveUnitCost: "102",
      targetPrice: "150",
      targetQuantity: "1",
      currentPrice: "110",
    });
    expect(fromPrice.targetPercent.toString()).toBe("50");
    expect(fromPrice.expectedProfit.toString()).toBe("48");
  });
});
