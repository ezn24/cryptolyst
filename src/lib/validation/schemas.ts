import { z } from "zod";
import { D } from "@/lib/decimal";
import { DEFAULT_ASSET_COLOR, normalizeAssetColor } from "@/lib/assets/presentation";

const decimalString = z
  .string()
  .trim()
  .min(1, "此欄位為必填")
  .refine((value) => {
    try {
      return D(value).isFinite();
    } catch {
      return false;
    }
  }, "數值格式不正確");

const optionalDecimalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) return true;
    try {
      return D(value).isFinite();
    } catch {
      return false;
    }
  }, "數值格式不正確");

export const positiveDecimal = decimalString.refine((value) => D(value).gt(0), "必須大於 0");
export const nonNegativeDecimal = decimalString.refine((value) => D(value).gte(0), "不可小於 0");

export const assetSchema = z.object({
  symbol: z.string().trim().min(1, "代號為必填").max(16).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, "名稱為必填").max(80),
  coingeckoId: z.string().trim().optional().or(z.literal("")),
  binanceSymbol: z.string().trim().optional().or(z.literal("")),
  priceSource: z.enum(["coingecko", "binance", "manual"]).default("coingecko"),
  currentPrice: nonNegativeDecimal.default("0"),
  iconUrl: z.string().trim().url("圖示網址格式不正確").optional().or(z.literal("")),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "顏色必須是 #RRGGBB 格式")
    .transform(normalizeAssetColor)
    .default(DEFAULT_ASSET_COLOR),
  isActive: z.boolean().default(true),
});

export const buyLotSchema = z.object({
  assetId: z.string().min(1, "資產不存在"),
  date: z.coerce.date({ error: "日期格式不正確" }),
  price: positiveDecimal,
  quantity: positiveDecimal,
  fee: nonNegativeDecimal.default("0"),
  feeCurrency: z.string().trim().min(1).default("USDT"),
  exchange: z.string().trim().optional().or(z.literal("")),
  account: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  isIncluded: z.boolean().default(true),
});

export const saleSchema = z.object({
  buyLotId: z.string().min(1, "買入批次不存在"),
  date: z.coerce.date({ error: "日期格式不正確" }),
  price: positiveDecimal,
  quantity: positiveDecimal,
  fee: nonNegativeDecimal.default("0"),
  feeCurrency: z.string().trim().min(1).default("USDT"),
  exchange: z.string().trim().optional().or(z.literal("")),
  account: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

export const assetConversionSchema = z.object({
  sourceAssetId: z.string().min(1, "來源資產不存在"),
  targetAssetId: z.string().min(1, "目標資產不存在"),
  date: z.coerce.date({ error: "日期格式不正確" }),
  targetQuantity: positiveDecimal,
  fee: nonNegativeDecimal.default("0"),
  feeCurrency: z.string().trim().min(1).default("USDT"),
  exchange: z.string().trim().optional().or(z.literal("")),
  account: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
}).refine((value) => value.sourceAssetId !== value.targetAssetId, {
  message: "來源與目標資產不可相同",
  path: ["targetAssetId"],
});

export const targetSchema = z
  .object({
    buyLotId: z.string().min(1, "買入批次不存在"),
    targetPercent: optionalDecimalString,
    targetPrice: optionalDecimalString,
    targetQuantity: positiveDecimal,
    note: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      (value.targetPrice && D(value.targetPrice).gt(0)) ||
      (value.targetPercent && D(value.targetPercent).gt(-100)),
    {
      message: "請輸入目標漲幅或大於 0 的目標價格",
      path: ["targetPrice"],
    },
  );

export const settingSchema = z.object({
  baseCurrency: z.string().trim().min(1).default("USDT"),
  priceProvider: z.enum(["coingecko", "binance"]).default("coingecko"),
  priceRefreshInterval: z.coerce.number().int().min(1).max(1440).default(5),
  timezone: z.string().trim().min(1).default("Asia/Singapore"),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
  decimalPrecision: z.coerce.number().int().min(2).max(18).default(8),
  defaultFeeCurrency: z.string().trim().min(1).default("USDT"),
  portfolioChartRange: z.enum(["24H", "7D", "30D", "90D", "1Y", "ALL"]).default("30D"),
  showCompletedLots: z.boolean().default(true),
});

