import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import path from "node:path";
import fs from "node:fs";
import { normalizeLegacyAvailableStatus } from "../src/lib/import/legacy-status";

const prisma = new PrismaClient();
const file = process.argv.find((arg) => arg.toLowerCase().endsWith(".xlsx"));
const commit = process.argv.includes("--commit");
const replaceExisting = process.argv.includes("--replace-existing");

if (!file) {
  console.error("Usage: npm run import:legacy -- <xlsx-path> [--commit] [--replace-existing]");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`Workbook not found: ${file}`);
  process.exit(1);
}

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const workbook = XLSX.readFile(file, { cellDates: true, raw: true });
const importedAt = fs.statSync(file).mtime;
const symbols = ["BTC", "ETH", "SOL", "SUI", "BNB", "OP", "TRUMP", "LINK"];
const assetNames: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  SUI: "Sui",
  BNB: "BNB",
  OP: "Optimism",
  TRUMP: "Official Trump",
  LINK: "Chainlink",
};

type LegacySale = {
  slot: number;
  price: string;
  quantity: string;
  synthetic?: boolean;
};

type LegacyTarget = {
  targetPercent: string;
  targetPrice: string;
};

type LegacyLot = {
  symbol: string;
  sheetName: string;
  rowNumber: number;
  price: string;
  quantity: string;
  sales: LegacySale[];
  target: LegacyTarget | null;
  remainingQuantity: string;
  warnings: string[];
};

function decimal(value: unknown): Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const parsed = new Decimal(String(value).trim());
    return parsed.isFinite() ? parsed : null;
  } catch {
    return null;
  }
}

function positive(value: unknown): Decimal | null {
  const parsed = decimal(value);
  return parsed?.gt(0) ? parsed : null;
}

function rows(sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
}

function targetFor(symbol: string, dataIndex: number, remainingQuantity: Decimal): LegacyTarget | null {
  if (remainingQuantity.lte(0)) return null;
  const overview = rows(`${symbol}_Overview`);
  const overviewRow = overview[dataIndex + 1];
  if (!overviewRow) return null;
  const percentRatio = decimal(overviewRow[8]);
  const targetPrice = positive(overviewRow[9]);
  if (!targetPrice) return null;
  return {
    targetPercent: (percentRatio ?? new Decimal(0)).mul(100).toString(),
    targetPrice: targetPrice.toString(),
  };
}

function parseLots(symbol: string): LegacyLot[] {
  const modernSheet = `${symbol} 2.0`;
  const sheetName = workbook.Sheets[modernSheet] ? modernSheet : symbol;
  const sourceRows = rows(sheetName);
  const modern = sheetName.endsWith(" 2.0");
  const buyPriceIndex = modern ? 9 : 0;
  const salePriceStart = modern ? 10 : 1;
  const buyQuantityIndex = modern ? 15 : 6;
  const saleQuantityStart = modern ? 16 : 7;
  const availableStatusIndex = modern ? 2 : null;

  return sourceRows.slice(1).flatMap((row, dataIndex) => {
    const buyPrice = positive(row[buyPriceIndex]);
    const buyQuantity = positive(row[buyQuantityIndex]);
    if (!buyPrice || !buyQuantity) return [];

    const warnings: string[] = [];
    const sales: LegacySale[] = [];
    for (let slot = 0; slot < 5; slot += 1) {
      const salePrice = positive(row[salePriceStart + slot]);
      const saleQuantity = positive(row[saleQuantityStart + slot]);
      if (salePrice && saleQuantity) {
        sales.push({
          slot: slot + 1,
          price: salePrice.toString(),
          quantity: saleQuantity.toString(),
        });
      } else if (salePrice || saleQuantity) {
        warnings.push(`sale slot ${slot + 1} has price/quantity mismatch`);
      }
    }

    const normalized = normalizeLegacyAvailableStatus({
      buyPrice: buyPrice.toString(),
      buyQuantity: buyQuantity.toString(),
      sales,
      availableStatus: availableStatusIndex === null ? null : row[availableStatusIndex],
    });
    const rawRemaining = normalized.rawRemaining;
    if (rawRemaining.lt(0)) {
      warnings.push(`sold quantity exceeds buy quantity by ${rawRemaining.abs().toString()}`);
    }
    if (normalized.syntheticSale) {
      warnings.push(
        `available status is 0; added closing sale for ${normalized.syntheticSale.quantity} at ${normalized.syntheticSale.price}`,
      );
    }
    const remainingQuantity = normalized.remainingQuantity;

    return [{
      symbol,
      sheetName,
      rowNumber: dataIndex + 2,
      price: buyPrice.toString(),
      quantity: buyQuantity.toString(),
      sales: normalized.sales,
      target: targetFor(symbol, dataIndex, remainingQuantity),
      remainingQuantity: remainingQuantity.toString(),
      warnings,
    }];
  });
}

function priceMap() {
  const result = new Map<string, string>();
  for (const row of rows("Price").slice(1)) {
    const symbol = String(row[0] ?? "").trim().toUpperCase();
    const price = positive(row[1]);
    if (symbols.includes(symbol) && price) result.set(symbol, price.toString());
  }
  return result;
}

const prices = priceMap();
const lots = symbols.flatMap(parseLots);
const summary = symbols.map((symbol) => {
  const assetLots = lots.filter((lot) => lot.symbol === symbol);
  const purchased = assetLots.reduce((sum, lot) => sum.plus(lot.quantity), new Decimal(0));
  const sold = assetLots.flatMap((lot) => lot.sales).reduce(
    (sum, sale) => sum.plus(sale.quantity),
    new Decimal(0),
  );
  const originalCost = assetLots.reduce(
    (sum, lot) => sum.plus(new Decimal(lot.price).mul(lot.quantity)),
    new Decimal(0),
  );
  return {
    symbol,
    sheet: assetLots[0]?.sheetName ?? "missing",
    currentPrice: prices.get(symbol) ?? "not in Price sheet",
    buyLots: assetLots.length,
    sales: assetLots.reduce((sum, lot) => sum + lot.sales.length, 0),
    targets: assetLots.filter((lot) => lot.target).length,
    purchased: purchased.toString(),
    sold: sold.toString(),
    remaining: Decimal.max(purchased.minus(sold), 0).toString(),
    originalCost: originalCost.toDecimalPlaces(8).toString(),
    warnings: assetLots.reduce((sum, lot) => sum + lot.warnings.length, 0),
  };
});

console.log("Cryptolyst legacy Excel import");
console.log(`Source: ${path.resolve(file)}`);
console.log(`Fallback date (workbook has no transaction dates): ${importedAt.toISOString()}`);
console.table(summary);

const warnings = lots.flatMap((lot) =>
  lot.warnings.map((warning) => `${lot.sheetName} row ${lot.rowNumber}: ${warning}`),
);
if (warnings.length) {
  console.log("Data quality warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

async function main() {
  if (!commit) {
    console.log("Dry-run only. Add --commit to write data.");
    console.log("If the database already has buy lots, also add --replace-existing.");
    return;
  }

  const existingLots = await prisma.buyLot.count();
  if (existingLots > 0 && !replaceExisting) {
    throw new Error(
      `Database already contains ${existingLots} buy lots. Re-run with --replace-existing after taking a backup.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.profitTarget.deleteMany();
      await tx.priceHistory.deleteMany();
      await tx.sale.deleteMany();
      await tx.buyLot.deleteMany();
    }

    const assetIds = new Map<string, string>();
    for (const symbol of symbols) {
      const currentPrice = prices.get(symbol);
      const asset = await tx.asset.upsert({
        where: { symbol },
        create: {
          symbol,
          name: assetNames[symbol] ?? symbol,
          priceSource: "manual",
          currentPrice: currentPrice ?? "0",
          priceUpdatedAt: currentPrice ? importedAt : null,
        },
        update: {
          name: assetNames[symbol] ?? symbol,
          priceSource: "manual",
          currentPrice: currentPrice ?? "0",
          priceUpdatedAt: currentPrice ? importedAt : null,
        },
      });
      assetIds.set(symbol, asset.id);
      if (currentPrice) {
        await tx.priceHistory.create({
          data: {
            assetId: asset.id,
            price: currentPrice,
            currency: "USDT",
            source: "legacy-xlsx",
            timestamp: importedAt,
          },
        });
      }
    }

    for (const lot of lots) {
      const assetId = assetIds.get(lot.symbol);
      if (!assetId) throw new Error(`Missing asset id for ${lot.symbol}`);
      const noteParts = [
        `Legacy Excel import: ${lot.sheetName} row ${lot.rowNumber}`,
        "Original workbook does not contain transaction dates; workbook modified date is used.",
        ...lot.warnings,
      ];
      const createdLot = await tx.buyLot.create({
        data: {
          assetId,
          date: importedAt,
          price: lot.price,
          quantity: lot.quantity,
          fee: "0",
          feeCurrency: "USDT",
          note: noteParts.join(" | "),
          isIncluded: true,
        },
      });

      for (const sale of lot.sales) {
        await tx.sale.create({
          data: {
            buyLotId: createdLot.id,
            date: importedAt,
            price: sale.price,
            quantity: sale.quantity,
            fee: "0",
            feeCurrency: "USDT",
            note: sale.synthetic
              ? `Legacy Excel import: ${lot.sheetName} row ${lot.rowNumber} | Available status was 0; synthetic closing sale created from remaining quantity.`
              : `Legacy Excel import: ${lot.sheetName} row ${lot.rowNumber}, sale slot ${sale.slot} | Original workbook does not contain transaction dates.`,
          },
        });
      }

      if (lot.target && new Decimal(lot.remainingQuantity).gt(0)) {
        await tx.profitTarget.create({
          data: {
            buyLotId: createdLot.id,
            targetPercent: lot.target.targetPercent,
            targetPrice: lot.target.targetPrice,
            targetQuantity: lot.remainingQuantity,
            note: `Legacy Excel import: ${lot.symbol}_Overview row ${lot.rowNumber}`,
          },
        });
      }
    }
  });

  console.log(`Committed ${lots.length} buy lots and ${lots.reduce((sum, lot) => sum + lot.sales.length, 0)} sales.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());



