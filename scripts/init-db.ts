import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "coingeckoId" TEXT,
    "binanceSymbol" TEXT,
    "priceSource" TEXT NOT NULL DEFAULT 'coingecko',
    "currentPrice" DECIMAL NOT NULL DEFAULT 0,
    "priceCurrency" TEXT NOT NULL DEFAULT 'USDT',
    "priceUpdatedAt" DATETIME,
    "priceChange24h" DECIMAL NOT NULL DEFAULT 0,
    "iconUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "BuyLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "fee" DECIMAL NOT NULL DEFAULT 0,
    "feeCurrency" TEXT NOT NULL DEFAULT 'USDT',
    "exchange" TEXT,
    "account" TEXT,
    "note" TEXT,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyLot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyLotId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "fee" DECIMAL NOT NULL DEFAULT 0,
    "feeCurrency" TEXT NOT NULL DEFAULT 'USDT',
    "exchange" TEXT,
    "account" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_buyLotId_fkey" FOREIGN KEY ("buyLotId") REFERENCES "BuyLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ProfitTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyLotId" TEXT NOT NULL,
    "targetPercent" DECIMAL NOT NULL,
    "targetPrice" DECIMAL NOT NULL,
    "targetQuantity" DECIMAL NOT NULL,
    "isReached" BOOLEAN NOT NULL DEFAULT false,
    "reachedAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfitTarget_buyLotId_fkey" FOREIGN KEY ("buyLotId") REFERENCES "BuyLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "source" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "baseCurrency" TEXT NOT NULL DEFAULT 'USDT',
    "priceProvider" TEXT NOT NULL DEFAULT 'coingecko',
    "priceRefreshInterval" INTEGER NOT NULL DEFAULT 5,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "decimalPrecision" INTEGER NOT NULL DEFAULT 8,
    "defaultFeeCurrency" TEXT NOT NULL DEFAULT 'USDT',
    "portfolioChartRange" TEXT NOT NULL DEFAULT '30D',
    "showCompletedLots" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "BuyLot_assetId_idx" ON "BuyLot"("assetId")`,
  `CREATE INDEX IF NOT EXISTS "BuyLot_date_idx" ON "BuyLot"("date")`,
  `CREATE INDEX IF NOT EXISTS "Sale_buyLotId_idx" ON "Sale"("buyLotId")`,
  `CREATE INDEX IF NOT EXISTS "Sale_date_idx" ON "Sale"("date")`,
  `CREATE INDEX IF NOT EXISTS "ProfitTarget_buyLotId_idx" ON "ProfitTarget"("buyLotId")`,
  `CREATE INDEX IF NOT EXISTS "ProfitTarget_isReached_idx" ON "ProfitTarget"("isReached")`,
  `CREATE INDEX IF NOT EXISTS "PriceHistory_assetId_timestamp_idx" ON "PriceHistory"("assetId", "timestamp")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PriceHistory_assetId_source_timestamp_key" ON "PriceHistory"("assetId", "source", "timestamp")`,
  `INSERT OR IGNORE INTO "AppSetting" ("id") VALUES ('singleton')`,
];

const spreadsheetColors = {
  ETH: "#7030A0",
  BTC: "#FFFF00",
  SOL: "#92D050",
  SUI: "#00B0F0",
  BNB: "#FFC000",
  OP: "#FF0000",
  TRUMP: "#FFE699",
  LINK: "#2A5ADA",
} as const;

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  let colorColumnAdded = false;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Asset" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748B'`,
    );
    colorColumnAdded = true;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name")) {
      throw error;
    }
  }

  if (colorColumnAdded) {
    for (const [symbol, color] of Object.entries(spreadsheetColors)) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Asset" SET "color" = ? WHERE "symbol" = ?`,
        color,
        symbol,
      );
    }
  }
  console.log("Cryptolyst database schema is ready.");
}

main().finally(async () => prisma.$disconnect());
