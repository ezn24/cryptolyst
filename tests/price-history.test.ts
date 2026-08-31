import { describe, expect, it } from "vitest";
import { downsamplePricePoints, parsePriceRange, priceRangeStart, summarizePricePoints } from "@/lib/price-history";

describe("price history helpers", () => {
  it("falls back to 30D for an unsupported range", () => {
    expect(parsePriceRange("invalid")).toBe("30D");
    expect(parsePriceRange("7D")).toBe("7D");
  });

  it("calculates a deterministic range start", () => {
    const now = new Date("2026-09-01T00:00:00.000Z");
    expect(priceRangeStart("24H", now)?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(priceRangeStart("ALL", now)).toBeNull();
  });

  it("summarizes price movement", () => {
    const points = [
      { timestamp: 1, price: 100, source: "test" },
      { timestamp: 2, price: 80, source: "test" },
      { timestamp: 3, price: 125, source: "test" },
    ];
    expect(summarizePricePoints(points)).toEqual({ first: 100, last: 125, high: 125, low: 80, change: 25, changePercent: 25 });
  });

  it("keeps extremes while limiting large histories", () => {
    const points = Array.from({ length: 2_000 }, (_, index) => ({ timestamp: index, price: 100 + Math.sin(index) * 10, source: "test" }));
    points[777].price = 1;
    points[1_333].price = 999;
    const sampled = downsamplePricePoints(points, 200);
    expect(sampled.length).toBeLessThanOrEqual(200);
    expect(sampled.some((point) => point.price === 1)).toBe(true);
    expect(sampled.some((point) => point.price === 999)).toBe(true);
    expect(sampled[0].timestamp).toBe(0);
    expect(sampled.at(-1)?.timestamp).toBe(1_999);
  });
});
