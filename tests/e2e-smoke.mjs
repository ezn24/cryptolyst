import fs from "node:fs/promises";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const symbol = `E2E${Date.now().toString().slice(-8)}`;
const screenshots = "F:/Dev/cryptolyst/.logs";
const browserErrors = [];
let browser;

async function cleanup() {
  const asset = await prisma.asset.findUnique({ where: { symbol } });
  if (!asset) return;
  const lots = await prisma.buyLot.findMany({ where: { assetId: asset.id }, select: { id: true } });
  const lotIds = lots.map((lot) => lot.id);
  await prisma.$transaction([
    prisma.profitTarget.deleteMany({ where: { buyLotId: { in: lotIds } } }),
    prisma.sale.deleteMany({ where: { buyLotId: { in: lotIds } } }),
    prisma.buyLot.deleteMany({ where: { assetId: asset.id } }),
    prisma.priceHistory.deleteMany({ where: { assetId: asset.id } }),
    prisma.asset.delete({ where: { id: asset.id } }),
  ]);
}

try {
  await fs.mkdir(screenshots, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("http://localhost:3000/login");
  await page.getByLabel("密碼").fill("cryptolyst-local");
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await page.waitForURL("http://localhost:3000/");

  await page.goto("http://localhost:3000/assets/manage");
  await page.getByRole("button", { name: "新增資產" }).first().click();
  await page.getByLabel("代號").fill(symbol);
  await page.getByLabel("名稱").fill("E2E Smoke Asset");
  await page.getByLabel("價格來源").selectOption("manual");
  await page.getByLabel("目前價格").fill("110");
  await page.getByRole("button", { name: "建立資產" }).click();
  await page.getByText("資產已新增").waitFor();
  await page.waitForTimeout(700);

  await page.getByPlaceholder("搜尋代號或名稱").fill(symbol);
  await page.getByRole("button", { name: "套用" }).click();
  await page.waitForURL((url) => url.searchParams.get("q") === symbol);
  await page.getByRole("link", { name: symbol, exact: true }).click();

  await page.getByRole("button", { name: "記錄買入" }).first().click();
  await page.getByLabel("買入日期").fill("2026-07-27");
  await page.getByLabel("買入價格").fill("100");
  await page.getByLabel("買入數量").fill("2");
  await page.getByLabel("手續費", { exact: true }).fill("2");
  await page.getByLabel("交易所").fill("E2E Exchange");
  await page.getByRole("button", { name: "新增買入" }).click();
  await page.getByText("買入批次已新增").waitFor();
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "記錄賣出" }).click();
  await page.getByLabel("賣出價格").fill("120");
  await page.getByLabel("賣出數量").fill("0.5");
  await page.getByLabel("手續費", { exact: true }).fill("1");
  await page.getByRole("button", { name: "新增賣出" }).click();
  await page.getByText("賣出紀錄已新增").waitFor();
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "止盈目標" }).click();
  await page.getByLabel("目標漲幅 %").fill("25");
  await page.getByLabel("目標賣出數量").fill("0.5");
  await page.getByRole("button", { name: "新增目標" }).click();
  await page.getByText("止盈目標已新增").waitFor();
  await page.waitForTimeout(700);

  await page.getByTitle("編輯賣出").click();
  await page.getByLabel("賣出價格").fill("121");
  await page.getByRole("button", { name: "儲存賣出紀錄" }).click();
  await page.getByText("賣出紀錄已更新").waitFor();
  await page.waitForTimeout(700);

  await page.getByTitle("編輯止盈目標").click();
  await page.getByLabel("目標漲幅 %").fill("30");
  await page.getByRole("button", { name: "儲存目標" }).click();
  await page.getByText("止盈目標已更新").waitFor();
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "編輯批次" }).click();
  await page.getByLabel("交易所").fill("Updated Exchange");
  await page.getByRole("button", { name: "儲存批次" }).click();
  await page.getByText("買入批次已更新").waitFor();
  await page.waitForTimeout(700);

  await page.screenshot({ path: `${screenshots}/e2e-desktop.png`, fullPage: true });
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshots}/e2e-mobile.png`, fullPage: true });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const overflowElements = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width };
      })
      .filter((item) => item.right > window.innerWidth + 1 || item.left < -1)
      .slice(0, 20),
  );

  if (desktopOverflow || mobileOverflow) throw new Error(`Unexpected page overflow: desktop=${desktopOverflow}, mobile=${mobileOverflow}, elements=${JSON.stringify(overflowElements)}`);
  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);

  await page.setViewportSize({ width: 1440, height: 1000 });
  const targetDelete = page.getByTitle("刪除止盈目標");
  await targetDelete.click();
  await page.getByRole("button", { name: "確認刪除" }).click();
  await targetDelete.waitFor({ state: "detached" });

  const saleDelete = page.getByTitle("刪除賣出紀錄");
  await saleDelete.click();
  await page.getByRole("button", { name: "確認刪除" }).click();
  await saleDelete.waitFor({ state: "detached" });

  const lotDelete = page.getByRole("button", { name: "刪除批次" });
  await lotDelete.click();
  await page.getByRole("button", { name: "確認刪除" }).click();
  await lotDelete.waitFor({ state: "detached" });

  await page.goto(`http://localhost:3000/assets/manage?q=${symbol}`);
  const assetDelete = page.getByTitle("刪除或停用資產");
  await assetDelete.click();
  await page.getByRole("button", { name: "確認刪除" }).click();
  await assetDelete.waitFor({ state: "detached" });

  console.log(JSON.stringify({
    login: "ok",
    assetCreate: "ok",
    buyCreate: "ok",
    saleCreate: "ok",
    targetCreate: "ok",
    edits: "ok",
    deletes: "ok",
    desktopOverflow,
    mobileOverflow,
    browserErrors: browserErrors.length,
  }));
} finally {
  if (browser) await browser.close();
  await cleanup();
  await prisma.$disconnect();
}


