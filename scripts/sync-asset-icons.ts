import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: { coingeckoId: { not: null }, iconUrl: null },
    select: { id: true, symbol: true, coingeckoId: true },
  });
  if (!assets.length) {
    console.log("No asset icons need updating.");
    return;
  }

  const ids = assets.flatMap((asset) => asset.coingeckoId ?? []).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  const rows = (await response.json()) as { id: string; image?: string }[];
  const images = new Map(rows.map((row) => [row.id, row.image]));

  let updated = 0;
  for (const asset of assets) {
    const iconUrl = asset.coingeckoId ? images.get(asset.coingeckoId) : null;
    if (!iconUrl) continue;
    await prisma.asset.update({ where: { id: asset.id }, data: { iconUrl } });
    updated += 1;
    console.log(`${asset.symbol}: ${iconUrl}`);
  }
  console.log(`Updated ${updated} asset icons.`);
}

main().finally(async () => prisma.$disconnect());
