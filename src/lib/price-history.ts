export const PRICE_RANGES = ["24H", "7D", "30D", "90D", "1Y", "ALL"] as const;

export type PriceRange = (typeof PRICE_RANGES)[number];

const rangeMilliseconds: Record<Exclude<PriceRange, "ALL">, number> = {
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
  "90D": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

export function parsePriceRange(value: string | null | undefined): PriceRange {
  return PRICE_RANGES.includes(value as PriceRange) ? (value as PriceRange) : "30D";
}

export function priceRangeStart(range: PriceRange, now = new Date()) {
  return range === "ALL" ? null : new Date(now.getTime() - rangeMilliseconds[range]);
}

export type NumericPricePoint = { timestamp: number; price: number; source: string };

export function downsamplePricePoints(points: NumericPricePoint[], maxPoints = 600) {
  if (points.length <= maxPoints) return points;
  const bucketSize = Math.ceil(points.length / Math.max(1, Math.floor(maxPoints / 4)));
  const sampled: NumericPricePoint[] = [];
  for (let index = 0; index < points.length; index += bucketSize) {
    const bucket = points.slice(index, index + bucketSize);
    const low = bucket.reduce((best, point) => point.price < best.price ? point : best);
    const high = bucket.reduce((best, point) => point.price > best.price ? point : best);
    const candidates = [bucket[0], low, high, bucket.at(-1)!].sort((a, b) => a.timestamp - b.timestamp);
    for (const point of candidates) {
      if (sampled.at(-1)?.timestamp !== point.timestamp) sampled.push(point);
    }
  }
  return sampled.slice(0, maxPoints);
}

export function summarizePricePoints(points: NumericPricePoint[]) {
  if (!points.length) return null;
  const first = points[0].price;
  const last = points.at(-1)!.price;
  const high = Math.max(...points.map((point) => point.price));
  const low = Math.min(...points.map((point) => point.price));
  const change = last - first;
  const changePercent = first > 0 ? (change / first) * 100 : 0;
  return { first, last, high, low, change, changePercent };
}
