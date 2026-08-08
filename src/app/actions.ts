"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import Papa from "papaparse";
import { createSession, destroySession, requireSession, verifyPassword } from "@/lib/auth/session";
import { createAsset, deleteOrDisableAsset, updateAsset } from "@/lib/services/asset-service";
import { createBuyLot, deleteBuyLot, updateBuyLot } from "@/lib/services/buy-lot-service";
import { createSale, deleteSale, updateSale } from "@/lib/services/sale-service";
import {
  createProfitTarget,
  deleteProfitTarget,
  updateProfitTarget,
} from "@/lib/services/target-service";
import { setManualPrice, updateAssetPrices } from "@/lib/services/price-service";
import { reschedulePriceScheduler } from "@/lib/services/price-scheduler";
import { prisma } from "@/lib/db";
import { asBool, formText } from "@/lib/utils";
import { D } from "@/lib/decimal";
import { buyLotSchema, saleSchema, settingSchema } from "@/lib/validation/schemas";
import { parseJsonBackup } from "@/lib/import/json-backup";

export type ActionResult = {
  ok: boolean;
  message: string;
};

const success = (message: string): ActionResult => ({ ok: true, message });

function failure(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return { ok: false, message: error.issues[0]?.message ?? "輸入資料格式不正確" };
  }
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return { ok: false, message: "已有相同代號的資產" };
    }
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "操作失敗，請稍後再試" };
}

function refreshAsset(assetId?: string) {
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/targets");
  if (assetId) revalidatePath(`/assets/${assetId}`);
}

export async function loginAction(_: unknown, formData: FormData) {
  const password = formText(formData, "password") ?? "";
  try {
    if (!(await verifyPassword(password))) return { error: "密碼不正確" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      error: message.includes("not configured")
        ? "尚未設定 APP_PASSWORD_HASH，請先在 .env 設定登入密碼雜湊。"
        : message.includes("invalid bcrypt format")
          ? "APP_PASSWORD_HASH 格式不正確，請使用 bcrypt $2a$、$2b$ 或 $2y$ 格式。"
          : "登入設定不完整，請檢查 .env。",
    };
  }
  await createSession();
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

function assetInput(formData: FormData) {
  return {
    symbol: formText(formData, "symbol"),
    name: formText(formData, "name"),
    coingeckoId: formText(formData, "coingeckoId") ?? "",
    binanceSymbol: formText(formData, "binanceSymbol") ?? "",
    priceSource: formText(formData, "priceSource") ?? "coingecko",
    currentPrice: formText(formData, "currentPrice") ?? "0",
    iconUrl: formText(formData, "iconUrl") ?? "",
    color: formText(formData, "color") ?? "#64748B",
    isActive: formData.has("isActive") ? asBool(formData.get("isActive")) : true,
  };
}

export async function createAssetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    await createAsset(assetInput(formData));
    refreshAsset();
    return success("資產已新增");
  } catch (error) {
    return failure(error);
  }
}

export async function updateAssetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("資產不存在");
    await updateAsset(id, assetInput(formData));
    refreshAsset(id);
    return success("資產設定已更新");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAssetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("資產不存在");
    const result = await deleteOrDisableAsset(id);
    refreshAsset(id);
    return success("isActive" in result && !result.isActive ? "資產已有交易，已改為停用" : "資產已刪除");
  } catch (error) {
    return failure(error);
  }
}

function buyLotInput(formData: FormData) {
  return {
    assetId: formText(formData, "assetId"),
    date: formText(formData, "date"),
    price: formText(formData, "price"),
    quantity: formText(formData, "quantity"),
    fee: formText(formData, "fee") ?? "0",
    feeCurrency: formText(formData, "feeCurrency") ?? "USDT",
    exchange: formText(formData, "exchange") ?? "",
    account: formText(formData, "account") ?? "",
    note: formText(formData, "note") ?? "",
    isIncluded: !asBool(formData.get("excluded")),
  };
}

export async function createBuyLotAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const result = await createBuyLot(buyLotInput(formData));
    refreshAsset(result.assetId);
    return success("買入批次已新增");
  } catch (error) {
    return failure(error);
  }
}

export async function updateBuyLotAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("買入批次不存在");
    const result = await updateBuyLot(id, buyLotInput(formData));
    refreshAsset(result.assetId);
    return success("買入批次已更新");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBuyLotAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("買入批次不存在");
    const existing = await prisma.buyLot.findUnique({ where: { id } });
    await deleteBuyLot(id);
    refreshAsset(existing?.assetId);
    return success("買入批次已刪除");
  } catch (error) {
    return failure(error);
  }
}

function saleInput(formData: FormData) {
  return {
    buyLotId: formText(formData, "buyLotId"),
    date: formText(formData, "date"),
    price: formText(formData, "price"),
    quantity: formText(formData, "quantity"),
    fee: formText(formData, "fee") ?? "0",
    feeCurrency: formText(formData, "feeCurrency") ?? "USDT",
    exchange: formText(formData, "exchange") ?? "",
    account: formText(formData, "account") ?? "",
    note: formText(formData, "note") ?? "",
  };
}

export async function createSaleAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const result = await createSale(saleInput(formData));
    const lot = await prisma.buyLot.findUnique({ where: { id: result.buyLotId } });
    refreshAsset(lot?.assetId);
    return success("賣出紀錄已新增");
  } catch (error) {
    return failure(error);
  }
}

export async function updateSaleAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("賣出紀錄不存在");
    const result = await updateSale(id, saleInput(formData));
    const lot = await prisma.buyLot.findUnique({ where: { id: result.buyLotId } });
    refreshAsset(lot?.assetId);
    return success("賣出紀錄已更新");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteSaleAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("賣出紀錄不存在");
    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { buyLot: true },
    });
    await deleteSale(id);
    refreshAsset(existing?.buyLot.assetId);
    return success("賣出紀錄已刪除");
  } catch (error) {
    return failure(error);
  }
}

function targetInput(formData: FormData) {
  return {
    buyLotId: formText(formData, "buyLotId"),
    targetPercent: formText(formData, "targetPercent") ?? "",
    targetPrice: formText(formData, "targetPrice") ?? "",
    targetQuantity: formText(formData, "targetQuantity"),
    note: formText(formData, "note") ?? "",
  };
}

export async function createTargetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const result = await createProfitTarget(targetInput(formData));
    refreshAsset(result.assetId);
    return success("止盈目標已新增");
  } catch (error) {
    return failure(error);
  }
}

export async function updateTargetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("止盈目標不存在");
    const result = await updateProfitTarget(id, targetInput(formData));
    refreshAsset(result.assetId);
    return success("止盈目標已更新");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTargetAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const id = formText(formData, "id");
    if (!id) throw new Error("止盈目標不存在");
    const result = await deleteProfitTarget(id);
    refreshAsset(result.assetId);
    return success("止盈目標已刪除");
  } catch (error) {
    return failure(error);
  }
}

export async function updatePricesAction() {
  await requireSession();
  await updateAssetPrices();
  revalidatePath("/");
}

export async function setManualPriceAction(formData: FormData) {
  await requireSession();
  const assetId = formText(formData, "assetId");
  const price = formText(formData, "price");
  if (assetId && price) await setManualPrice(assetId, D(price).toString());
  revalidatePath("/prices");
}

export async function updateSettingsAction(formData: FormData) {
  await requireSession();
  const values = settingSchema.parse({
    baseCurrency: formText(formData, "baseCurrency") ?? "USDT",
    priceProvider: formText(formData, "priceProvider") ?? "coingecko",
    priceRefreshInterval: formText(formData, "priceRefreshInterval") ?? "5",
    timezone: formText(formData, "timezone") ?? "Asia/Singapore",
    theme: formText(formData, "theme") ?? "dark",
    decimalPrecision: formText(formData, "decimalPrecision") ?? "8",
    defaultFeeCurrency: formText(formData, "defaultFeeCurrency") ?? "USDT",
    portfolioChartRange: formText(formData, "portfolioChartRange") ?? "30D",
    showCompletedLots: asBool(formData.get("showCompletedLots")),
  });
  await prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...values },
    update: values,
  });
  await reschedulePriceScheduler();
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

type CsvTransactionRow = {
  type?: string;
  asset?: string;
  date?: string;
  price?: string;
  quantity?: string;
  fee?: string;
  feeCurrency?: string;
  exchange?: string;
  account?: string;
  note?: string;
  buyLotReference?: string;
};

export async function importTransactionsCsvAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const csvText = formText(formData, "csvText");
    if (!csvText) throw new Error("CSV 內容為空");

    const parsed = Papa.parse<CsvTransactionRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    if (parsed.errors.length) throw new Error(`CSV 格式錯誤：${parsed.errors[0]?.message}`);
    if (!parsed.data.length) throw new Error("CSV 沒有可匯入的交易");

    const result = await prisma.$transaction(async (tx) => {
      let buyCount = 0;
      let saleCount = 0;
      const assets = await tx.asset.findMany();
      const assetBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset]));

      for (const [index, row] of parsed.data.entries()) {
        const rowNumber = index + 2;
        const type = row.type?.trim().toUpperCase();
        const asset = assetBySymbol.get(row.asset?.trim().toUpperCase() ?? "");
        if (!asset) throw new Error(`第 ${rowNumber} 列：找不到資產 ${row.asset || "（空白）"}`);

        if (type === "BUY") {
          const data = buyLotSchema.parse({
            assetId: asset.id,
            date: row.date,
            price: row.price,
            quantity: row.quantity,
            fee: row.fee?.trim() || "0",
            feeCurrency: row.feeCurrency?.trim() || "USDT",
            exchange: row.exchange?.trim() || "",
            account: row.account?.trim() || "",
            note: row.note?.trim() || "",
            isIncluded: true,
          });
          await tx.buyLot.create({
            data: {
              assetId: data.assetId,
              date: data.date,
              price: D(data.price).toString(),
              quantity: D(data.quantity).toString(),
              fee: D(data.fee).toString(),
              feeCurrency: data.feeCurrency,
              exchange: data.exchange || null,
              account: data.account || null,
              note: data.note || null,
              isIncluded: true,
            },
          });
          buyCount += 1;
          continue;
        }

        if (type === "SELL") {
          const buyLotId = row.buyLotReference?.trim();
          if (!buyLotId) throw new Error(`第 ${rowNumber} 列：賣出交易缺少 buyLotReference`);
          const data = saleSchema.parse({
            buyLotId,
            date: row.date,
            price: row.price,
            quantity: row.quantity,
            fee: row.fee?.trim() || "0",
            feeCurrency: row.feeCurrency?.trim() || "USDT",
            exchange: row.exchange?.trim() || "",
            account: row.account?.trim() || "",
            note: row.note?.trim() || "",
          });
          const lot = await tx.buyLot.findUnique({ where: { id: buyLotId }, include: { sales: true } });
          if (!lot || lot.assetId !== asset.id) throw new Error(`第 ${rowNumber} 列：buyLotReference 不屬於 ${asset.symbol}`);
          const sold = lot.sales.reduce((sum, sale) => sum.plus(D(sale.quantity)), D(0));
          if (sold.plus(D(data.quantity)).gt(D(lot.quantity))) throw new Error(`第 ${rowNumber} 列：賣出數量超過批次剩餘數量`);
          await tx.sale.create({
            data: {
              buyLotId,
              date: data.date,
              price: D(data.price).toString(),
              quantity: D(data.quantity).toString(),
              fee: D(data.fee).toString(),
              feeCurrency: data.feeCurrency,
              exchange: data.exchange || null,
              account: data.account || null,
              note: data.note || null,
            },
          });
          saleCount += 1;
          continue;
        }

        throw new Error(`第 ${rowNumber} 列：type 必須是 BUY 或 SELL`);
      }
      return { buyCount, saleCount };
    });

    refreshAsset();
    return success(`匯入完成：${result.buyCount} 筆買入、${result.saleCount} 筆賣出`);
  } catch (error) {
    return failure(error);
  }
}

export async function importJsonBackupAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const jsonText = formText(formData, "jsonText");
    if (!jsonText) throw new Error("JSON 內容為空");
    const backup = parseJsonBackup(jsonText);

    await prisma.$transaction(async (tx) => {
      const existingCounts = await Promise.all([
        tx.asset.count(), tx.buyLot.count(), tx.sale.count(),
        tx.profitTarget.count(), tx.priceHistory.count(),
      ]);
      if (existingCounts.some((count) => count > 0)) {
        throw new Error("目前資料庫已有投資資料；JSON 完整還原只允許用於空白資料庫，以避免覆蓋現有紀錄。");
      }

      if (backup.assets.length) await tx.asset.createMany({ data: backup.assets });
      if (backup.buyLots.length) await tx.buyLot.createMany({ data: backup.buyLots });
      if (backup.sales.length) await tx.sale.createMany({ data: backup.sales });
      if (backup.targets.length) await tx.profitTarget.createMany({ data: backup.targets });
      if (backup.priceHistory.length) await tx.priceHistory.createMany({ data: backup.priceHistory });
      for (const setting of backup.settings) {
        await tx.appSetting.upsert({ where: { id: setting.id }, create: setting, update: setting });
      }
    }, { maxWait: 10_000, timeout: 60_000 });

    await reschedulePriceScheduler();
    revalidatePath("/", "layout");
    return success(
      `JSON 還原完成：${backup.assets.length} 個資產、${backup.buyLots.length} 個批次、` +
      `${backup.sales.length} 筆賣出、${backup.targets.length} 個目標、${backup.priceHistory.length} 筆價格歷史`,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function updateSinglePriceAction(formData: FormData) {
  await requireSession();
  const assetId = formText(formData, "assetId");
  if (assetId) await updateAssetPrices(assetId);
  revalidatePath("/");
  revalidatePath("/prices");
  if (assetId) revalidatePath(`/assets/${assetId}`);
}



