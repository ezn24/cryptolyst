import { describe, expect, it } from "vitest";
import { parseJsonBackup } from "@/lib/import/json-backup";

const minimalBackup = {
  exportedAt: "2026-08-09T00:00:00.000Z",
  assets: [{ id: "asset-1", symbol: "BTC", name: "Bitcoin" }],
  buyLots: [],
  sales: [],
  targets: [],
  settings: [{ id: "singleton" }],
};

describe("JSON backup parsing", () => {
  it("accepts an older backup without price history and supplies defaults", () => {
    const parsed = parseJsonBackup(JSON.stringify(minimalBackup));
    expect(parsed.priceHistory).toEqual([]);
    expect(parsed.conversions).toEqual([]);
    expect(parsed.assets[0].currentPrice).toBe("0");
    expect(parsed.settings[0].priceRefreshInterval).toBe(5);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseJsonBackup("{broken")).toThrow("JSON 格式不正確");
  });

  it("rejects a backup missing required collections", () => {
    expect(() => parseJsonBackup(JSON.stringify({ assets: [] }))).toThrow();
  });
});
