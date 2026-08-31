import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AllocationChart, PortfolioLineChart, ProfitBarChart } from "@/components/dashboard/charts";
import { AssetEditor } from "@/components/management-forms";
import { AssetIcon } from "@/components/assets/asset-icon";
import { EmptyState, LinkButton, Metric, Panel } from "@/components/ui/primitives";
import { getPortfolioData } from "@/lib/services/portfolio-service";
import { decimalString, money, pct, D } from "@/lib/decimal";

export const dynamic = "force-dynamic";

function tone(value: unknown) {
  return D(value as string).gt(0) ? "positive" : D(value as string).lt(0) ? "negative" : "neutral";
}

export default async function DashboardPage() {
  const { assets, portfolio } = await getPortfolioData();
  const allocation = assets
    .filter(({ metrics }) => metrics.currentMarketValue.gt(0))
    .map(({ asset, metrics }) => ({
      name: asset.symbol,
      value: Number(metrics.currentMarketValue.toString()),
      color: asset.color,
    }));
  const profit = assets
    .filter(({ asset }) => asset.buyLots.length > 0)
    .map(({ asset, metrics }) => ({
      name: asset.symbol,
      realized: Number(metrics.realizedProfit.toString()),
      unrealized: Number(metrics.unrealizedProfit.toString()),
      color: asset.color,
    }));
  const historyTimestamps = Array.from(
    new Set(assets.flatMap(({ asset }) => asset.priceHistory.map((point) => point.timestamp.getTime()))),
  ).sort((a, b) => a - b);
  const history = historyTimestamps.slice(-120).map((timestamp) => {
    const row: { time: string; total: number } & Record<string, string | number> = {
      time: new Date(timestamp).toISOString().slice(5, 16).replace("T", " "),
      total: 0,
    };
    const total = assets.reduce((sum, { asset, metrics }) => {
      const latestPrice = asset.priceHistory
        .filter((point) => point.timestamp.getTime() <= timestamp)
        .at(-1)?.price;
      const value = latestPrice ? latestPrice.mul(metrics.totalRemainingQuantity) : D(0);
      row[asset.id] = Number(value.toString());
      return sum.plus(value);
    }, D(0));
    row.total = Number(total.toString());
    return row;
  });
  const historySeries = assets
    .filter(({ asset, metrics }) => metrics.totalRemainingQuantity.gt(0) && asset.priceHistory.length > 0)
    .map(({ asset }) => ({ key: asset.id, label: asset.symbol, color: asset.color }));

  return (
    <AppShell
      title="投資組合總覽"
      description={`${portfolio.holdingAssetCount} 種持倉 · ${portfolio.openLotCount} 個進行中批次`}
      actions={<AssetEditor />}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="目前總市值" value={money(portfolio.currentMarketValue)} />
        <Metric label="剩餘持倉成本" value={money(portfolio.totalRemainingCost)} />
        <Metric label="已實現損益" value={money(portfolio.realizedProfit)} tone={tone(portfolio.realizedProfit)} />
        <Metric label="未實現損益" value={money(portfolio.unrealizedProfit)} tone={tone(portfolio.unrealizedProfit)} />
        <Metric label="累計總損益" value={money(portfolio.totalProfit)} tone={tone(portfolio.totalProfit)} />
        <Metric label="總報酬率" value={pct(portfolio.portfolioReturnPercent)} tone={tone(portfolio.portfolioReturnPercent)} />
      </div>

      {assets.length ? (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Panel>
              <h2 className="text-sm font-semibold">資產配置</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">目前市值占比；滑過圖表查看 USDT 與百分比</p>
              {allocation.length ? <AllocationChart data={allocation} /> : <ChartEmpty />}
            </Panel>
            <Panel>
              <h2 className="text-sm font-semibold">各幣種損益拆分</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">綠色／藍色為盈利，紅色為虧損；分開顯示，不互相抵銷</p>
              {profit.length ? <ProfitBarChart data={profit} /> : <ChartEmpty />}
            </Panel>
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">持倉估算走勢</h2>
                <Link href="/prices" className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
                  完整走勢 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">以目前剩餘數量按各時間點價格重新估值</p>
              <PortfolioLineChart data={history} series={historySeries} />
            </Panel>
          </div>

          <Panel className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">持倉概況</h2>
              <LinkButton href="/assets" className="h-9">
                開啟帳本 <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="pb-3">資產</th>
                    <th>即時價格</th>
                    <th>24h</th>
                    <th>剩餘數量</th>
                    <th>平均成本</th>
                    <th>剩餘成本</th>
                    <th>目前市值</th>
                    <th>已實現</th>
                    <th>未實現</th>
                    <th>總損益</th>
                    <th>報酬率</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(({ asset, metrics }) => (
                    <tr key={asset.id} className="border-t border-white/10">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <AssetIcon
                            symbol={asset.symbol}
                            name={asset.name}
                            iconUrl={asset.iconUrl}
                            color={asset.color}
                          />
                          <div>
                            <Link className="font-semibold text-white hover:text-emerald-300" href={`/assets/${asset.id}`}>
                              {asset.symbol}
                            </Link>
                            <div className="text-xs text-zinc-500">{asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>{money(asset.currentPrice, asset.priceCurrency)}</td>
                      <td className={tone(asset.priceChange24h)}>{pct(asset.priceChange24h)}</td>
                      <td>{decimalString(metrics.totalRemainingQuantity)}</td>
                      <td>{money(metrics.averageEntryPrice)}</td>
                      <td>{money(metrics.totalRemainingCost)}</td>
                      <td>{money(metrics.currentMarketValue)}</td>
                      <td className={tone(metrics.realizedProfit)}>{money(metrics.realizedProfit)}</td>
                      <td className={tone(metrics.unrealizedProfit)}>{money(metrics.unrealizedProfit)}</td>
                      <td className={tone(metrics.totalProfit)}>{money(metrics.totalProfit)}</td>
                      <td className={tone(metrics.totalReturnPercent)}>{pct(metrics.totalReturnPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <Panel className="mt-5">
          <EmptyState
            title="建立你的第一個資產"
            description="Cryptolyst 會以買入批次為核心追蹤分批賣出、剩餘成本與已實現/未實現損益。"
            action={<AssetEditor />}
          />
        </Panel>
      )}
    </AppShell>
  );
}

function ChartEmpty() {
  return (
    <div className="grid h-64 place-items-center text-center text-sm text-zinc-500">
      <div>
        <Coins className="mx-auto mb-2 h-5 w-5" />
        資料累積後顯示
      </div>
    </div>
  );
}



