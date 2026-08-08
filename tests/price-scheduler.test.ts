import { describe, expect, it } from "vitest";
import { priceRefreshIntervalMs } from "@/lib/services/price-scheduler-config";

describe("price refresh scheduler", () => {
  it("converts the configured minute interval to milliseconds", () => {
    expect(priceRefreshIntervalMs(1)).toBe(60_000);
    expect(priceRefreshIntervalMs(30)).toBe(1_800_000);
    expect(priceRefreshIntervalMs(1_440)).toBe(86_400_000);
  });

  it("uses the fallback for invalid or out-of-range values", () => {
    expect(priceRefreshIntervalMs(0, 8)).toBe(480_000);
    expect(priceRefreshIntervalMs(1_441, 8)).toBe(480_000);
    expect(priceRefreshIntervalMs("invalid", 8)).toBe(480_000);
  });

  it("uses five minutes if both values are invalid", () => {
    expect(priceRefreshIntervalMs(null, null)).toBe(300_000);
  });
});
