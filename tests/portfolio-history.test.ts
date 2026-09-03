import { describe, expect, it } from "vitest";
import { createPeriodReport, holdingStatusRank, snapshotAt, type HistoricalAsset } from "@/lib/portfolio-history";

const date = (day: number) => new Date(Date.UTC(2026, 7, day));
function asset(): HistoricalAsset {
  return {
    id: "eth", symbol: "ETH", color: "#ffffff",
    lots: [{ date: date(1), price: 100, quantity: 1, fee: 0, sales: [{ date: date(15), price: 150, quantity: 0.5, fee: 0 }] }],
    prices: [{ timestamp: date(1), price: 100 }, { timestamp: date(10), price: 120 }, { timestamp: date(20), price: 110 }],
  };
}

describe("portfolio periods", () => {
  it("orders open and partially sold lots ahead of closed and excluded lots", () => {
    expect(["closed", "partial", "disabled", "open"].sort((a, b) => holdingStatusRank(a) - holdingStatusRank(b)))
      .toEqual(["open", "partial", "closed", "disabled"]);
  });

  it("reconstructs quantities using only trades already made", () => {
    expect(snapshotAt(asset(), date(0).getTime()).metrics.totalRemainingQuantity.toNumber()).toBe(0);
    expect(snapshotAt(asset(), date(10).getTime()).metrics.totalRemainingQuantity.toNumber()).toBe(1);
    expect(snapshotAt(asset(), date(20).getTime()).metrics.totalRemainingQuantity.toNumber()).toBe(0.5);
    expect(snapshotAt(asset(), date(10).getTime()).metrics.currentMarketValue.toNumber()).toBe(120);
  });

  it("reports period P&L deltas, not lifetime profit", () => {
    const { rows } = createPeriodReport([asset()], date(10), date(20));
    expect(rows[0].realized.toNumber()).toBe(25);
    expect(rows[0].unrealized?.toNumber()).toBe(-15);
    expect(rows[0].profit?.toNumber()).toBe(10);
    expect(rows[0].priceChange?.toNumber()).toBeCloseTo(-8.333333);
  });

  it("does not use future quotes or fill missing valuations with zero", () => {
    const input = asset();
    input.prices = [{ timestamp: date(20), price: 110 }];
    const report = createPeriodReport([input], date(10), date(20));
    expect(report.incomplete).toBe(true);
    expect(report.rows[0].priceChange).toBeNull();
    expect(report.rows[0].unrealized).toBeNull();
    expect(report.rows[0].realized.toNumber()).toBe(25);
    expect(report.history[0].total).toBeNull();
    expect(report.history.at(-1)?.total).toBe(55);
  });

  it("keeps transaction boundaries and both interval endpoints", () => {
    const report = createPeriodReport([asset()], date(10), date(20));
    expect(report.history[0].time).toBe(date(10).toISOString());
    expect(report.history.at(-1)?.time).toBe(date(20).toISOString());
    expect(report.history.find((row) => row.time === date(15).toISOString())?.total).toBe(60);
    expect(report.history.find((row) => row.time === new Date(date(15).getTime() - 1).toISOString())?.total).toBe(120);
  });

  it("uses a zero position baseline for the full ledger period", () => {
    const report = createPeriodReport([asset()], date(0), date(20), true);
    expect(report.rows[0].before.valued).toBe(true);
    expect(report.rows[0].profit?.toNumber()).toBe(30);
    expect(report.rows[0].priceChange?.toNumber()).toBe(10);
  });

  it("excludes disabled lots and permits closed positions without quotes", () => {
    const input = asset();
    input.prices = [];
    input.lots[0].isIncluded = false;
    expect(snapshotAt(input, date(20).getTime()).valued).toBe(true);
    input.lots[0].isIncluded = true;
    input.lots[0].sales[0].quantity = 1;
    const snapshot = snapshotAt(input, date(20).getTime());
    expect(snapshot.valued).toBe(true);
    expect(snapshot.metrics.totalRemainingQuantity.toNumber()).toBe(0);
  });
});
