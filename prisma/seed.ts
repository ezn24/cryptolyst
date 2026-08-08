import { PrismaClient } from "@prisma/client";
import { defaultAssetColor } from "../src/lib/assets/presentation";

const prisma = new PrismaClient();

const assets = [
  ["BTC", "Bitcoin", "bitcoin", "BTCUSDT", "60000"],
  ["ETH", "Ethereum", "ethereum", "ETHUSDT", "3000"],
  ["SOL", "Solana", "solana", "SOLUSDT", "150"],
  ["SUI", "Sui", "sui", "SUIUSDT", "3"],
  ["BNB", "BNB", "binancecoin", "BNBUSDT", "600"],
  ["OP", "Optimism", "optimism", "OPUSDT", "2"],
  ["TRUMP", "Official Trump", "official-trump", "TRUMPUSDT", "8"],
  ["LINK", "Chainlink", "chainlink", "LINKUSDT", "15"],
];

async function main() {
  await prisma.appSetting.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  for (const [symbol, name, coingeckoId, binanceSymbol, currentPrice] of assets) {
    const color = defaultAssetColor(symbol);
    await prisma.asset.upsert({
      where: { symbol },
      update: { name, coingeckoId, binanceSymbol, currentPrice, color },
      create: { symbol, name, coingeckoId, binanceSymbol, currentPrice, color, priceUpdatedAt: new Date() },
    });
  }
  const btc = await prisma.asset.findUniqueOrThrow({ where: { symbol: "BTC" } });
  const eth = await prisma.asset.findUniqueOrThrow({ where: { symbol: "ETH" } });
  const sol = await prisma.asset.findUniqueOrThrow({ where: { symbol: "SOL" } });
  const sui = await prisma.asset.findUniqueOrThrow({ where: { symbol: "SUI" } });
  const bnb = await prisma.asset.findUniqueOrThrow({ where: { symbol: "BNB" } });

  const btcLot = await prisma.buyLot.create({ data: { assetId: btc.id, date: new Date("2025-01-10"), price: "45000", quantity: "0.05", fee: "5", exchange: "Binance", account: "Main" } });
  const ethLot = await prisma.buyLot.create({ data: { assetId: eth.id, date: new Date("2025-02-10"), price: "2500", quantity: "2", fee: "3" } });
  const solLot = await prisma.buyLot.create({ data: { assetId: sol.id, date: new Date("2025-03-01"), price: "120", quantity: "10", fee: "1" } });
  const suiLot = await prisma.buyLot.create({ data: { assetId: sui.id, date: new Date("2025-04-01"), price: "1.2", quantity: "1000", fee: "1" } });
  await prisma.buyLot.create({ data: { assetId: bnb.id, date: new Date("2025-05-01"), price: "580", quantity: "3", fee: "12" } });

  await prisma.sale.create({ data: { buyLotId: ethLot.id, date: new Date("2025-06-01"), price: "3200", quantity: "0.5", fee: "1" } });
  await prisma.sale.create({ data: { buyLotId: solLot.id, date: new Date("2025-07-01"), price: "160", quantity: "10", fee: "1" } });
  await prisma.sale.create({ data: { buyLotId: suiLot.id, date: new Date("2025-08-01"), price: "2", quantity: "200", fee: "1" } });
  await prisma.sale.create({ data: { buyLotId: suiLot.id, date: new Date("2025-09-01"), price: "3", quantity: "200", fee: "1" } });
  await prisma.profitTarget.create({ data: { buyLotId: btcLot.id, targetPercent: "20", targetPrice: "54000", targetQuantity: "0.01" } });
}

main().finally(async () => prisma.$disconnect());
