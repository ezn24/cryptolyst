import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AllocationChart, PortfolioLineChart, ProfitBarChart } from "@/components/dashboard/charts";
import { AssetEditor } from "@/components/management-forms";
import { AssetIcon } from "@/components/assets/asset-icon";
import { EmptyState, LinkButton, Metric, Panel } from "@/components/ui/primitives";
import { getPortfolioData } from "@/lib/services/portfolio-service";
import { getDashboardReport } from "@/lib/services/dashboard-service";
import { PriceHistoryExplorer } from "@/components/prices/price-history-explorer";
import { PRICE_RANGES, parsePriceRange } from "@/lib/price-history";
import { cn } from "@/lib/utils";
import { decimalString, money, pct, D } from "@/lib/decimal";

export const dynamic = "force-dynamic";

function tone(value: unknown) {
  return D(value as string).gt(0) ? "positive" : D(value as string).lt(0) ? "negative" : "neutral";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parsePriceRange((await searchParams).range);
  const { assets, portfolio } = await getPortfolioData();
  const report = await getDashboardReport(assets, range);
  const entries = assets.map(({ asset }, index) => ({ asset, period: report.rows[index], metrics: report.rows[index].after.metrics }))
    .sort((a, b) => Number(b.metrics.totalRemainingQuantity.gt(0)) - Number(a.metrics.totalRemainingQuantity.gt(0)));
  const allocationAt = (side: "before" | "after") => entries
    .filter(({ period }) => period[side].valued && period[side].metrics.currentMarketValue.gt(0))
    .map(({ asset, period }) => ({ name: asset.symbol, value: period[side].metrics.currentMarketValue.toNumber(), color: asset.color }));
  const baselineComplete = entries.every(({ period }) => period.before.valued);
  const currentComplete = entries.every(({ period }) => period.after.valued);
  const profit = entries.filter(({ asset }) => asset.buyLots.length > 0)
    .map(({ asset, period }) => ({ name: asset.symbol, realized: period.realized.toNumber(), unrealized: period.unrealized?.toNumber() ?? null, color: asset.color }));
  const historySeries = assets
    .filter(({ asset }) => asset.buyLots.some((lot) => lot.isIncluded))
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
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border)] py-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarRange className="h-4 w-4 text-[var(--muted)]" />
              <span className="font-semibold">分析期間</span>
              <span className="text-xs text-[var(--muted)]">{report.from.toLocaleDateString("zh-TW")} 至目前</span>
            </div>
            <nav aria-label="總覽時間跨度" className="flex max-w-full overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--control)] p-1">
              {PRICE_RANGES.map((option) => (
                <Link key={option} href={`/?range=${option}`} scroll={false} aria-current={range === option ? "page" : undefined}
                  className={cn("flex h-8 shrink-0 items-center rounded px-3 text-xs font-semibold", range === option ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted-strong)]")}
                >{option === "ALL" ? "全部" : option}</Link>
              ))}
            </nav>
          </div>
          <section className="mt-5 border-b border-[var(--border)] pb-5">
            <h2 className="mb-3 font-semibold">歷史價格與區間走勢</h2>
            <PriceHistoryExplorer compare fixedRange={range} assets={entries.map(({ asset }) => ({ id: asset.id, symbol: asset.symbol, name: asset.name, color: asset.color }))} />
          </section>
          {report.incomplete ? <p role="status" className="mt-4 text-sm text-[var(--muted-strong)]">部分幣種缺少期初或目前報價，對應的估值及區間損益顯示為資料不足。</p> : null}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Panel>
              <h2 className="text-sm font-semibold">資產配置</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">內圈：期初 · 外圈：目前</p>
              <AllocationChart data={currentComplete ? allocationAt("after") : []} baseline={baselineComplete ? allocationAt("before") : []} />
              <p className="text-xs text-[var(--muted)]">{!baselineComplete ? "期初報價不足" : !allocationAt("before").length ? "期初無持倉" : "期初與目前持倉市值占比"}{!currentComplete ? " · 目前報價不足" : ""}</p>
            </Panel>
            <Panel>
              <h2 className="text-sm font-semibold">各幣種損益拆分</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">{range === "ALL" ? "累計" : "區間"}已實現損益 · 未實現損益變化</p>
              <ProfitBarChart data={profit} />
            </Panel>
            <Panel>
              <h2 className="text-sm font-semibold">持倉估算走勢</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">當時持有數量 × 當時報價 · 含買賣及轉換變動</p>
              <PortfolioLineChart data={report.history} series={historySeries} />
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
                    <th>{range === "ALL" ? "歷史" : range} 價格漲跌</th>
                    <th>剩餘數量</th>
                    <th>平均成本</th>
                    <th>剩餘成本</th>
                    <th>目前市值</th>
                    <th>區間已實現</th>
                    <th>未實現變化</th>
                    <th>區間總損益</th>
                    <th>累計報酬率</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(({ asset, metrics, period }) => (
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
                      <td className={period.priceChange === null ? "" : tone(period.priceChange)}>{period.priceChange === null ? "資料不足" : pct(period.priceChange)}</td>
                      <td>{decimalString(metrics.totalRemainingQuantity)}</td>
                      <td>{money(metrics.averageEntryPrice)}</td>
                      <td>{money(metrics.totalRemainingCost)}</td>
                      <td>{period.after.valued ? money(metrics.currentMarketValue) : "資料不足"}</td>
                      <td className={tone(period.realized)}>{money(period.realized)}</td>
                      <td className={period.unrealized === null ? "" : tone(period.unrealized)}>{period.unrealized === null ? "資料不足" : money(period.unrealized)}</td>
                      <td className={period.profit === null ? "" : tone(period.profit)}>{period.profit === null ? "資料不足" : money(period.profit)}</td>
                      <td className={tone(metrics.totalReturnPercent)}>{period.after.valued ? pct(metrics.totalReturnPercent) : "資料不足"}</td>
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
