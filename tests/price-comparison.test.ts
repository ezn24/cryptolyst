import { describe, expect, it } from "vitest";
import { buildPriceComparison, type ComparisonInput } from "@/lib/price-comparison";

const timestamp = (hour: number) => new Date(Date.UTC(2026, 8, 1, hour)).toISOString();
const input = (id: string, values: [number, number][]): ComparisonInput => ({
  asset: { id, symbol: id.toUpperCase(), name: id, color: "#ffffff", currency: "USDT" },
  points: values.map(([hour, price]) => ({ timestamp: timestamp(hour), price })),
});

describe("multi-asset price comparison", () => {
  it("compares very different coin prices from a common zero percent baseline", () => {
    const result = buildPriceComparison([input("btc", [[0, 60000], [2, 66000]]), input("eth", [[0, 2000], [2, 1800]])], "percent");
    expect(result.rows[0].btc).toBe(0);
    expect(result.rows[0].eth).toBe(0);
    expect(result.rows.at(-1)?.btc).toBeCloseTo(10);
    expect(result.rows.at(-1)?.eth).toBeCloseTo(-10);
    expect(result.rows.at(-1)?.btc_price).toBe(66000);
  });

  it("aligns asynchronous quotes without using a future price", () => {
    const result = buildPriceComparison([input("btc", [[0, 100], [3, 200]]), input("eth", [[1, 50], [4, 75]])], "percent");
    expect(result.from).toBe(Date.parse(timestamp(1)));
    expect(result.to).toBe(Date.parse(timestamp(3)));
    expect(result.series[0].base).toBe(100);
    expect(result.series[1].last).toBe(50);
    expect(result.rows.at(-1)?.btc).toBe(100);
    expect(result.rows.at(-1)?.eth).toBe(0);
  });

  it("keeps original values in price mode", () => {
    const result = buildPriceComparison([input("btc", [[0, 100], [3, 200]])], "price");
    expect(result.rows[0].btc).toBe(100);
    expect(result.rows.at(-1)?.btc).toBe(200);
  });

  it("excludes single-point histories without suppressing valid coins", () => {
    const result = buildPriceComparison([input("btc", [[0, 100], [3, 200]]), input("eth", [[1, 50]])], "percent");
    expect(result.series.map((item) => item.asset.id)).toEqual(["btc"]);
  });

  it("does not invent a shared period for non-overlapping histories", () => {
    const result = buildPriceComparison([input("btc", [[0, 100], [1, 200]]), input("eth", [[2, 50], [3, 75]])], "percent");
    expect(result.rows).toEqual([]);
  });

  it("does not divide a zero baseline or graph invalid prices", () => {
    const result = buildPriceComparison([input("btc", [[0, 0], [3, 200], [4, NaN]])], "percent");
    expect(result.series).toEqual([]);
  });
});
