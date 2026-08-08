import { z } from "zod";

const decimalValue = z.union([z.string(), z.number()]).transform(String);
const nullableText = z.string().nullable().optional();
const optionalDate = z.coerce.date().nullable().optional();
const requiredDate = z.coerce.date();

const assetSchema = z.object({
  id: z.string().min(1), symbol: z.string().min(1), name: z.string().min(1),
  coingeckoId: nullableText, binanceSymbol: nullableText,
  priceSource: z.string().default("coingecko"), currentPrice: decimalValue.default("0"),
  priceCurrency: z.string().default("USDT"), priceUpdatedAt: optionalDate,
  priceChange24h: decimalValue.default("0"), iconUrl: nullableText,
  color: z.string().default("#64748B"), isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0), createdAt: requiredDate.optional(), updatedAt: requiredDate.optional(),
});

const buyLotSchema = z.object({
  id: z.string().min(1), assetId: z.string().min(1), date: requiredDate,
  price: decimalValue, quantity: decimalValue, fee: decimalValue.default("0"),
  feeCurrency: z.string().default("USDT"), exchange: nullableText, account: nullableText,
  note: nullableText, isIncluded: z.boolean().default(true),
  createdAt: requiredDate.optional(), updatedAt: requiredDate.optional(),
});

const saleSchema = z.object({
  id: z.string().min(1), buyLotId: z.string().min(1), date: requiredDate,
  price: decimalValue, quantity: decimalValue, fee: decimalValue.default("0"),
  feeCurrency: z.string().default("USDT"), exchange: nullableText, account: nullableText,
  note: nullableText, createdAt: requiredDate.optional(), updatedAt: requiredDate.optional(),
});

const targetSchema = z.object({
  id: z.string().min(1), buyLotId: z.string().min(1), targetPercent: decimalValue,
  targetPrice: decimalValue, targetQuantity: decimalValue, isReached: z.boolean().default(false),
  reachedAt: optionalDate, note: nullableText, createdAt: requiredDate.optional(), updatedAt: requiredDate.optional(),
});

const priceHistorySchema = z.object({
  id: z.string().min(1), assetId: z.string().min(1), price: decimalValue,
  currency: z.string().default("USDT"), source: z.string().min(1), timestamp: requiredDate,
});

const settingSchema = z.object({
  id: z.string().min(1).default("singleton"), baseCurrency: z.string().default("USDT"),
  priceProvider: z.string().default("coingecko"), priceRefreshInterval: z.number().int().positive().default(5),
  timezone: z.string().default("Asia/Singapore"), theme: z.string().default("dark"),
  decimalPrecision: z.number().int().min(0).max(18).default(8),
  defaultFeeCurrency: z.string().default("USDT"), portfolioChartRange: z.string().default("30D"),
  showCompletedLots: z.boolean().default(true), createdAt: requiredDate.optional(), updatedAt: requiredDate.optional(),
});

export const jsonBackupSchema = z.object({
  formatVersion: z.number().int().positive().optional(), exportedAt: requiredDate.optional(),
  assets: z.array(assetSchema), buyLots: z.array(buyLotSchema), sales: z.array(saleSchema),
  targets: z.array(targetSchema), priceHistory: z.array(priceHistorySchema).default([]),
  settings: z.array(settingSchema),
});

export function parseJsonBackup(jsonText: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); } catch { throw new Error("JSON 格式不正確"); }
  return jsonBackupSchema.parse(parsed);
}
