import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { buyLotSchema } from "@/lib/validation/schemas";

export async function createBuyLot(input: unknown) {
  const data = buyLotSchema.parse(input);
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
  if (!asset) throw new Error("資產不存在");

  const lot = await prisma.$transaction((tx) =>
    tx.buyLot.create({
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
        isIncluded: data.isIncluded,
      },
    }),
  );
  revalidatePath("/");
  return lot;
}

export async function updateBuyLot(id: string, input: unknown) {
  const data = buyLotSchema.parse(input);
  const existing = await prisma.buyLot.findUnique({
    where: { id },
    include: { sales: true, destinationConversion: { select: { id: true } } },
  });
  if (!existing) throw new Error("買入批次不存在");
  if (existing.destinationConversion || existing.sales.some((sale) => sale.conversionId)) {
    throw new Error("資產轉換關聯的批次不可單獨編輯");
  }
  const sold = existing.sales.reduce((sum, sale) => sum.plus(D(sale.quantity)), D(0));
  if (sold.gt(D(data.quantity))) throw new Error("買入數量不可小於已賣出數量");

  const lot = await prisma.$transaction((tx) =>
    tx.buyLot.update({
      where: { id },
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
        isIncluded: data.isIncluded,
      },
    }),
  );
  revalidatePath("/");
  return lot;
}

export async function deleteBuyLot(id: string) {
  const conversion = await prisma.assetConversion.findUnique({ where: { destinationLotId: id } });
  if (conversion) throw new Error("資產轉換建立的目標批次不可單獨刪除");
  const saleCount = await prisma.sale.count({ where: { buyLotId: id } });
  if (saleCount > 0) throw new Error("此批次已有賣出紀錄，請先刪除 Sale");
  return prisma.buyLot.delete({ where: { id } });
}
