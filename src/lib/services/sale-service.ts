import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { saleSchema } from "@/lib/validation/schemas";

async function assertSaleQuantity(tx: typeof prisma, buyLotId: string, nextSaleQuantity: string, saleId?: string) {
  const lot = await tx.buyLot.findUnique({
    where: { id: buyLotId },
    include: { sales: true },
  });
  if (!lot) throw new Error("買入批次不存在");
  const otherSold = lot.sales
    .filter((sale) => sale.id !== saleId)
    .reduce((sum, sale) => sum.plus(D(sale.quantity)), D(0));
  const nextTotal = otherSold.plus(D(nextSaleQuantity));
  if (nextTotal.gt(D(lot.quantity))) {
    throw new Error("賣出數量總和不可超過買入數量");
  }
}

export async function createSale(input: unknown) {
  const data = saleSchema.parse(input);
  const sale = await prisma.$transaction(async (tx) => {
    await assertSaleQuantity(tx as typeof prisma, data.buyLotId, data.quantity);
    return tx.sale.create({
      data: {
        buyLotId: data.buyLotId,
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
  });
  revalidatePath("/");
  return sale;
}

export async function updateSale(id: string, input: unknown) {
  const data = saleSchema.parse(input);
  const existing = await prisma.sale.findUnique({ where: { id }, select: { conversionId: true } });
  if (existing?.conversionId) throw new Error("資產轉換產生的賣出紀錄不可單獨編輯");
  const sale = await prisma.$transaction(async (tx) => {
    await assertSaleQuantity(tx as typeof prisma, data.buyLotId, data.quantity, id);
    return tx.sale.update({
      where: { id },
      data: {
        buyLotId: data.buyLotId,
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
  });
  revalidatePath("/");
  return sale;
}

export async function deleteSale(id: string) {
  const existing = await prisma.sale.findUnique({ where: { id }, select: { conversionId: true } });
  if (existing?.conversionId) throw new Error("資產轉換產生的賣出紀錄不可單獨刪除");
  const sale = await prisma.$transaction((tx) => tx.sale.delete({ where: { id } }));
  revalidatePath("/");
  return sale;
}
