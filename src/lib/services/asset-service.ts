import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { D } from "@/lib/decimal";
import { assetSchema } from "@/lib/validation/schemas";

async function resolvedIconUrl(iconUrl: string, coingeckoId: string) {
  if (iconUrl || !coingeckoId) return iconUrl || null;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coingeckoId)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (!response.ok) return null;
    const [coin] = (await response.json()) as { image?: string }[];
    return coin?.image || null;
  } catch {
    return null;
  }
}

export async function createAsset(input: unknown) {
  const data = assetSchema.parse(input);
  const asset = await prisma.asset.create({
    data: {
      symbol: data.symbol,
      name: data.name,
      coingeckoId: data.coingeckoId || null,
      binanceSymbol: data.binanceSymbol || null,
      priceSource: data.priceSource,
      currentPrice: D(data.currentPrice).toString(),
      iconUrl: await resolvedIconUrl(data.iconUrl ?? "", data.coingeckoId ?? ""),
      color: data.color,
      isActive: data.isActive,
    },
  });
  revalidatePath("/");
  return asset;
}

export async function updateAsset(id: string, input: unknown) {
  const data = assetSchema.parse(input);
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      symbol: data.symbol,
      name: data.name,
      coingeckoId: data.coingeckoId || null,
      binanceSymbol: data.binanceSymbol || null,
      priceSource: data.priceSource,
      currentPrice: D(data.currentPrice).toString(),
      iconUrl: await resolvedIconUrl(data.iconUrl ?? "", data.coingeckoId ?? ""),
      color: data.color,
      isActive: data.isActive,
    },
  });
  revalidatePath("/");
  return asset;
}

export async function deleteOrDisableAsset(id: string) {
  const lotCount = await prisma.buyLot.count({ where: { assetId: id } });
  if (lotCount > 0) {
    return prisma.asset.update({ where: { id }, data: { isActive: false } });
  }
  return prisma.asset.delete({ where: { id } });
}

