import fs from "node:fs";
import path from "node:path";
import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

async function main() {
const prisma = new PrismaClient();
const file = process.argv.find((arg) => arg.toLowerCase().endsWith(".xlsx"));
const commit = process.argv.includes("--commit");
const marker = "Available status was 0; synthetic closing sale";

if (!file) {
  throw new Error("請提供來源 .xlsx 路徑。加上 --commit 才會寫入資料庫。");
}

const workbookPath = path.resolve(file);
if (!fs.existsSync(workbookPath)) throw new Error(`找不到檔案：${workbookPath}`);

const workbook = XLSX.readFile(workbookPath, { cellDates: true });
const rowsBySheet = new Map(
  workbook.SheetNames.map((sheetName) => [
    sheetName,
    XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    }),
  ]),
);

const lots = await prisma.buyLot.findMany({
  where: { note: { startsWith: "Legacy Excel import:" } },
  include: { asset: { select: { symbol: true } }, sales: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } },
});

let closed = 0;
let alreadyClosed = 0;
let skipped = 0;

for (const lot of lots) {
  const source = lot.note?.match(/^Legacy Excel import: (.+) row (\d+)/);
  if (!source) {
    skipped += 1;
    continue;
  }

  const [, sheetName, rowText] = source;
  const row = rowsBySheet.get(sheetName)?.[Number(rowText) - 1];
  const availableStatus = row?.[2];
  if (availableStatus === null || availableStatus === undefined || availableStatus === "") continue;

  let isZero = false;
  try {
    isZero = new Decimal(String(availableStatus)).eq(0);
  } catch {
    skipped += 1;
    continue;
  }
  if (!isZero) continue;

  const sold = lot.sales.reduce((sum, sale) => sum.plus(sale.quantity.toString()), new Decimal(0));
  const remaining = new Decimal(lot.quantity.toString()).minus(sold);
  if (remaining.lte(0)) {
    alreadyClosed += 1;
    continue;
  }

  const price = lot.sales.at(-1)?.price ?? lot.price;
  console.log(
    `${commit ? "CLOSE" : "WOULD CLOSE"} ${lot.asset.symbol} ${sheetName} row ${rowText}: ` +
      `${remaining.toString()} @ ${price.toString()}`,
  );

  if (commit) {
    await prisma.sale.create({
      data: {
        buyLotId: lot.id,
        date: lot.sales.at(-1)?.date ?? lot.date,
        price,
        quantity: remaining.toString(),
        fee: "0",
        feeCurrency: lot.feeCurrency,
        exchange: lot.exchange,
        account: lot.account,
        note: `${marker}; source ${sheetName} row ${rowText}.`,
      },
    });
  }
  closed += 1;
}

console.log(
  `${commit ? "COMMITTED" : "DRY RUN"}: closed=${closed}, alreadyClosed=${alreadyClosed}, skipped=${skipped}`,
);
await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
