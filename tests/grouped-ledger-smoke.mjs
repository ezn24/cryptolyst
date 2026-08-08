import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const suffix = Date.now().toString().slice(-6);
const symbols = [`GA${suffix}`, `GB${suffix}`];
let browser;

async function cleanup() {
  const assets = await prisma.asset.findMany({ where: { symbol: { in: symbols } } });
  for (const asset of assets) {
    await prisma.sale.deleteMany({ where: { buyLot: { assetId: asset.id } } });
    await prisma.profitTarget.deleteMany({ where: { buyLot: { assetId: asset.id } } });
    await prisma.buyLot.deleteMany({ where: { assetId: asset.id } });
    await prisma.priceHistory.deleteMany({ where: { assetId: asset.id } });
    await prisma.asset.delete({ where: { id: asset.id } });
  }
}

try {
  const [assetA, assetB] = await prisma.$transaction([
    prisma.asset.create({
      data: { symbol: symbols[0], name: "Grouped Asset A", priceSource: "manual", currentPrice: "110" },
    }),
    prisma.asset.create({
      data: { symbol: symbols[1], name: "Grouped Asset B", priceSource: "manual", currentPrice: "220" },
    }),
  ]);
  await prisma.$transaction([
    prisma.buyLot.create({
      data: { assetId: assetA.id, date: new Date("2026-07-27"), price: "101", quantity: "1" },
    }),
    prisma.buyLot.create({
      data: { assetId: assetB.id, date: new Date("2026-07-27"), price: "202", quantity: "2" },
    }),
  ]);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("密碼").fill("cryptolyst-local");
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await page.waitForURL("http://localhost:3000/");

  await page.goto(`http://localhost:3000/transactions?asset=${assetA.id}`);
  await page.getByRole("heading", { name: `${assetA.symbol} 交易帳本` }).waitFor();
  const table = page.locator("table");
  await table.getByText("101 USDT").first().waitFor();
  if (await table.getByText("202 USDT").count()) throw new Error("Asset B leaked into Asset A ledger");
  await table.getByText("0 USDT").waitFor();

  await page.getByRole("link", { name: new RegExp(`^${assetB.symbol}`) }).first().click();
  await page.getByRole("heading", { name: `${assetB.symbol} 交易帳本` }).waitFor();
  await page.locator("table").getByText("202 USDT").first().waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("Grouped ledger overflows on mobile");

  console.log(JSON.stringify({
    assetGrouping: "ok",
    assetSwitching: "ok",
    defaultFeeZero: "ok",
    mobileOverflow: false,
  }));
} finally {
  if (browser) await browser.close();
  await cleanup();
  await prisma.$disconnect();
}
