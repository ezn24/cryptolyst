import { describe, expect, it } from "vitest";
import { normalizeLegacyAvailableStatus } from "@/lib/import/legacy-status";

describe("legacy available status", () => {
  it("treats status 0 as fully sold", () => {
    const result = normalizeLegacyAvailableStatus({
      buyPrice: "100",
      buyQuantity: "2",
      sales: [{ slot: 1, price: "120", quantity: "1.5" }],
      availableStatus: 0,
    });

    expect(result.forcedClosed).toBe(true);
    expect(result.remainingQuantity.toString()).toBe("0");
    expect(result.syntheticSale).toEqual({
      slot: 6,
      price: "120",
      quantity: "0.5",
      synthetic: true,
    });
  });

  it("uses the buy price when a closed row has no sale price", () => {
    const result = normalizeLegacyAvailableStatus({
      buyPrice: "80",
      buyQuantity: "3",
      sales: [],
      availableStatus: "0",
    });

    expect(result.remainingQuantity.toString()).toBe("0");
    expect(result.syntheticSale?.price).toBe("80");
    expect(result.syntheticSale?.quantity).toBe("3");
  });

  it("keeps positive-status rows open", () => {
    const result = normalizeLegacyAvailableStatus({
      buyPrice: "100",
      buyQuantity: "2",
      sales: [{ slot: 1, price: "120", quantity: "0.5" }],
      availableStatus: 1,
    });

    expect(result.forcedClosed).toBe(false);
    expect(result.remainingQuantity.toString()).toBe("1.5");
    expect(result.syntheticSale).toBeNull();
  });
});
