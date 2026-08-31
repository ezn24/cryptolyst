import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ListTree } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AssetCharts } from "@/components/assets/asset-charts";
import { PriceHistoryExplorer } from "@/components/prices/price-history-explorer";
import {
  BuyLotEditor,
  AssetConversionEditor,
  DeleteEntityButton,
  SaleEditor,
  TargetEditor,
} from "@/components/management-forms";
import { EmptyState, Metric, Panel } from "@/components/ui/primitives";
import { getAssetDetail } from "@/lib/services/portfolio-service";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { calculateProfitTarget } from "@/lib/calculations/portfolio";
import { D, decimalString, money, pct } from "@/lib/decimal";

export const dynamic = "force-dynamic";

function tone(value: unknown) {
  return D(value as string).gt(0) ? "positive" : D(value as string).lt(0) ? "negative" : "neutral";
}

const statusLabels = {
  open: "持有中",
  partial: "部分賣出",
  closed: "已全部賣出",
  disabled: "不計入",
};

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  return <AssetLedger assetId={assetId} />;
}

export async function AssetLedger({ assetId }: { assetId: string }) {
  const detail = await getAssetDetail(assetId);
  if (!detail) notFound();
  const { asset, lots, metrics } = detail;
  const hasRemainingPosition = metrics.totalRemainingQuantity.gt(0);
  const hasRecoveredAllCost =
    hasRemainingPosition && metrics.totalSaleProceeds.gte(metrics.totalOriginalCost);
  const assetOptions = await prisma.asset.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { symbol: "asc" }],
    select: { id: true, symbol: true, name: true },
  });
  const conversions = await prisma.assetConversion.findMany({
    where: { OR: [{ sourceAssetId: asset.id }, { targetAssetId: asset.id }] },
    include: {
      sourceAsset: { select: { id: true, symbol: true } },
      targetAsset: { select: { id: true, symbol: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const chartData = lots.map((lot, index) => ({
    name: `批次 ${index + 1}`,
    bought: lot.quantity.toNumber(),
    sold: lot.metrics.soldQuantity.toNumber(),
    remaining: lot.metrics.remainingQuantity.toNumber(),
    cost: lot.metrics.remainingCost.toNumber(),
    marketValue: lot.metrics.remainingMarketValue.toNumber(),
    realized: lot.metrics.realizedProfit.toNumber(),
    unrealized: lot.metrics.unrealizedProfit.toNumber(),
    buyPrice: lot.price.toNumber(),
    currentPrice: asset.currentPrice.toNumber(),
    targetPrice: lot.targets[0]?.targetPrice.toNumber() ?? null,
  }));

  return (
    <AppShell
      title={`${asset.symbol} · ${asset.name}`}
      description={`${asset.priceSource} · ${asset.priceUpdatedAt?.toLocaleString("zh-TW") ?? "尚未更新價格"}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/assets/manage"
            title="管理幣種"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm hover:bg-white/10"
          >
            <ListTree className="h-4 w-4" />
            <span className="hidden sm:inline">管理幣種</span>
          </Link>
          <BuyLotEditor assetId={asset.id} symbol={asset.symbol} />
          <AssetConversionEditor
            sourceAssetId={asset.id}
            sourceSymbol={asset.symbol}
            sourceQuantity={metrics.totalRemainingQuantity.toString()}
            sourceCost={metrics.totalRemainingCost.toString()}
            assets={assetOptions.filter((option) => option.id !== asset.id)}
          />
        </div>
      }
    >
      <nav className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="選擇幣種">
        {assetOptions.map((option) => (
          <Link
            key={option.id}
            href={`/assets/${option.id}`}
            title={option.name}
            className={cn(
              "shrink-0 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/10",
              option.id === asset.id ? "bg-white text-zinc-950 hover:bg-white" : "bg-white/[0.04]",
            )}
          >
            {option.symbol}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Metric label="剩餘數量" value={decimalString(metrics.totalRemainingQuantity)} />
        <Metric label="平均成本" value={money(metrics.averageEntryPrice)} />
        <Metric
          label="保本價"
          value={!hasRemainingPosition ? "無持倉" : hasRecoveredAllCost ? "已回本" : money(metrics.breakEvenPrice)}
          tone={hasRecoveredAllCost ? "positive" : "neutral"}
          detail={
            !hasRemainingPosition
              ? "剩餘數量為 0，因此沒有適用的持倉保本價"
              : hasRecoveredAllCost
              ? "累計賣出淨收入已覆蓋全部買入成本；剩餘持倉即使按 0 計價，整體仍未虧損"
              : "剩餘持倉達到此單價時，累計已實現與未實現損益約為 0"
          }
        />
        <Metric label="目前市值" value={money(metrics.currentMarketValue)} />
        <Metric label="剩餘成本" value={money(metrics.totalRemainingCost)} />
        <Metric label="已實現損益" value={money(metrics.realizedProfit)} tone={tone(metrics.realizedProfit)} />
        <Metric label="未實現損益" value={money(metrics.unrealizedProfit)} tone={tone(metrics.unrealizedProfit)} />
        <Metric label="總報酬率" value={pct(metrics.totalReturnPercent)} tone={tone(metrics.totalReturnPercent)} />
      </div>

      <Panel className="mt-5">
        <div className="mb-1">
          <h2 className="font-semibold">{asset.symbol} 市場價格走勢</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">歷史報價 · 與下方交易批次損益分開計算</p>
        </div>
        <PriceHistoryExplorer
          compact
          assets={[{ id: asset.id, symbol: asset.symbol, name: asset.name, color: asset.color }]}
          initialAssetId={asset.id}
        />
      </Panel>

      <AssetCharts data={chartData} symbol={asset.symbol} />

      {conversions.length ? (
        <Panel className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">資產轉換紀錄</h2>
              <p className="mt-1 text-xs text-zinc-500">成本轉移不計為一般交易損益</p>
            </div>
            <span className="text-xs text-zinc-500">{conversions.length} 筆</span>
          </div>
          <div className="grid gap-2">
            {conversions.map((conversion) => {
              const outgoing = conversion.sourceAssetId === asset.id;
              const other = outgoing ? conversion.targetAsset : conversion.sourceAsset;
              const targetCost = D(conversion.transferredCost).plus(conversion.fee);
              const targetUnitCost = targetCost.div(conversion.targetQuantity);
              return (
                <div key={conversion.id} className="grid gap-2 rounded-md border border-white/10 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={outgoing ? "rounded-sm bg-sky-400/10 px-2 py-0.5 text-xs text-sky-300" : "rounded-sm bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300"}>
                        {outgoing ? "轉出" : "轉入"}
                      </span>
                      <span className="font-semibold">
                        {decimalString(conversion.sourceQuantity)} {conversion.sourceAsset.symbol} → {decimalString(conversion.targetQuantity)} {conversion.targetAsset.symbol}
                      </span>
                      <Link href={`/assets/${other.id}`} className="text-xs text-sky-300 hover:underline">查看 {other.symbol}</Link>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {conversion.date.toISOString().slice(0, 10)} · {conversion.exchange || "未填交易所"} · {conversion.account || "未填帳戶"}
                    </div>
                    {conversion.note ? <div className="mt-1 text-xs text-zinc-400">{conversion.note}</div> : null}
                  </div>
                  <div className="text-left md:text-right">
                    <div>{money(conversion.transferredCost)} 成本轉移</div>
                    <div className="text-xs text-zinc-500">目標單位成本 {money(targetUnitCost)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <div className="mt-5 grid gap-4">
        {lots.length ? (
          lots.map((lot, index) => (
            <Panel key={lot.id} className="p-0">
              <details open={index === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-sm bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-300">
                          批次 {index + 1}
                        </span>
                        <span className="font-semibold">買入 {decimalString(lot.quantity)} {asset.symbol}</span>
                        <span className="rounded-sm bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                          {statusLabels[lot.metrics.status as keyof typeof statusLabels]}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {lot.date.toISOString().slice(0, 10)} · {money(lot.price)} · {lot.exchange || "未填交易所"}
                      </div>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className={tone(lot.metrics.totalProfit)}>{money(lot.metrics.totalProfit)}</div>
                    <div className="text-xs text-zinc-500">{pct(lot.metrics.totalReturnPercent)}</div>
                  </div>
                </summary>

                <div className="border-t border-white/10 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4 xl:grid-cols-8">
                    <div><div className="text-xs text-zinc-500">原始成本</div>{money(lot.metrics.totalBuyCost)}</div>
                    <div><div className="text-xs text-zinc-500">有效單位成本</div>{money(lot.metrics.effectiveUnitCost)}</div>
                    <div><div className="text-xs text-zinc-500">已賣數量</div>{decimalString(lot.metrics.soldQuantity)}</div>
                    <div><div className="text-xs text-zinc-500">剩餘數量</div>{decimalString(lot.metrics.remainingQuantity)}</div>
                    <div><div className="text-xs text-zinc-500">剩餘成本</div>{money(lot.metrics.remainingCost)}</div>
                    <div><div className="text-xs text-zinc-500">目前市值</div>{money(lot.metrics.remainingMarketValue)}</div>
                    <div><div className="text-xs text-zinc-500">已實現</div><span className={tone(lot.metrics.realizedProfit)}>{money(lot.metrics.realizedProfit)}</span></div>
                    <div><div className="text-xs text-zinc-500">未實現</div><span className={tone(lot.metrics.unrealizedProfit)}>{money(lot.metrics.unrealizedProfit)}</span></div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    {lot.destinationConversion || lot.sales.some((sale) => sale.conversionId) ? (
                      <span className="rounded-md bg-sky-400/10 px-3 py-2 text-sm text-sky-300">資產轉換關聯批次</span>
                    ) : (
                      <>
                    <BuyLotEditor
                      assetId={asset.id}
                      symbol={asset.symbol}
                      lot={{
                        id: lot.id,
                        assetId: asset.id,
                        date: lot.date.toISOString().slice(0, 10),
                        price: lot.price.toString(),
                        quantity: lot.quantity.toString(),
                        fee: lot.fee.toString(),
                        feeCurrency: lot.feeCurrency,
                        exchange: lot.exchange ?? "",
                        account: lot.account ?? "",
                        note: lot.note ?? "",
                        isIncluded: lot.isIncluded,
                      }}
                    />
                    <DeleteEntityButton
                      kind="lot"
                      id={lot.id}
                      label="刪除批次"
                      description={
                        lot.sales.length
                          ? "此批次已有賣出紀錄，系統會阻止刪除。請先逐筆刪除賣出紀錄。"
                          : "此操作會永久刪除買入批次與其止盈目標。"
                      }
                    />
                      </>
                    )}
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <section className="min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">分批賣出</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{lot.sales.length} 筆</span>
                          {lot.metrics.remainingQuantity.gt(0) ? (
                            <SaleEditor
                              buyLotId={lot.id}
                              symbol={asset.symbol}
                              remainingQuantity={lot.metrics.remainingQuantity.toString()}
                              effectiveUnitCost={lot.metrics.effectiveUnitCost.toString()}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500">已無可賣數量</span>
                          )}
                        </div>
                      </div>
                      {lot.sales.length ? (
                        <div className="table-scroll rounded-md border border-white/10">
                          <table className="w-full min-w-[650px] text-left text-xs">
                            <thead className="bg-black/20 text-zinc-500">
                              <tr><th className="p-2">日期</th><th>價格</th><th>數量</th><th>手續費</th><th>交易所 / 帳戶</th><th className="text-right">操作</th></tr>
                            </thead>
                            <tbody>
                              {lot.sales.map((sale) => (
                                <tr key={sale.id} className="border-t border-white/10">
                                  <td className="p-2">{sale.date.toISOString().slice(0, 10)}</td>
                                  <td>{money(sale.price)}</td>
                                  <td>{decimalString(sale.quantity)}</td>
                                  <td>{money(sale.fee, sale.feeCurrency)}</td>
                                  <td>{sale.exchange || "-"} / {sale.account || "-"}</td>
                                  <td>
                                    <div className="flex justify-end">
                                      {sale.conversionId ? (
                                        <span className="rounded-sm bg-sky-400/10 px-2 py-1 text-sky-300">轉換產生</span>
                                      ) : (
                                        <>
                                      <SaleEditor
                                        compact
                                        buyLotId={lot.id}
                                        symbol={asset.symbol}
                                        remainingQuantity={lot.metrics.remainingQuantity.toString()}
                                        effectiveUnitCost={lot.metrics.effectiveUnitCost.toString()}
                                        sale={{
                                          id: sale.id,
                                          buyLotId: lot.id,
                                          date: sale.date.toISOString().slice(0, 10),
                                          price: sale.price.toString(),
                                          quantity: sale.quantity.toString(),
                                          fee: sale.fee.toString(),
                                          feeCurrency: sale.feeCurrency,
                                          exchange: sale.exchange ?? "",
                                          account: sale.account ?? "",
                                          note: sale.note ?? "",
                                        }}
                                      />
                                      <DeleteEntityButton
                                        compact
                                        kind="sale"
                                        id={sale.id}
                                        label="刪除賣出紀錄"
                                        description="刪除後，批次剩餘數量、成本與已實現損益會立即重新計算。"
                                      />
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-zinc-500">
                          尚無賣出紀錄
                        </div>
                      )}
                    </section>

                    <section className="min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">止盈目標</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{lot.targets.length} 個</span>
                          {lot.metrics.remainingQuantity.gt(0) ? (
                            <TargetEditor
                              buyLotId={lot.id}
                              symbol={asset.symbol}
                              buyPrice={lot.price.toString()}
                              remainingQuantity={lot.metrics.remainingQuantity.toString()}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500">已無剩餘持倉</span>
                          )}
                        </div>
                      </div>
                      {lot.targets.length ? (
                        <div className="grid gap-2">
                          {lot.targets.map((target) => {
                            const calc = calculateProfitTarget({
                              buyPrice: lot.price,
                              effectiveUnitCost: lot.metrics.effectiveUnitCost,
                              targetPrice: target.targetPrice,
                              targetQuantity: target.targetQuantity,
                              currentPrice: asset.currentPrice,
                            });
                            return (
                              <div key={target.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 p-3 text-sm">
                                <div>
                                  <div className="font-medium">{pct(target.targetPercent)} · {money(target.targetPrice)}</div>
                                  <div className="mt-1 text-xs text-zinc-500">
                                    {decimalString(target.targetQuantity)} {asset.symbol} · 預期損益 {money(calc.expectedProfit)}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <span className={calc.isReached ? "mr-2 text-xs text-emerald-300" : "mr-2 text-xs text-zinc-500"}>
                                    {calc.isReached ? "已到價" : `距離 ${pct(calc.distancePercent)}`}
                                  </span>
                                  <TargetEditor
                                    compact
                                    buyLotId={lot.id}
                                    symbol={asset.symbol}
                                    buyPrice={lot.price.toString()}
                                    remainingQuantity={lot.metrics.remainingQuantity.toString()}
                                    target={{
                                      id: target.id,
                                      buyLotId: lot.id,
                                      targetPercent: target.targetPercent.toString(),
                                      targetPrice: target.targetPrice.toString(),
                                      targetQuantity: target.targetQuantity.toString(),
                                      note: target.note ?? "",
                                    }}
                                  />
                                  <DeleteEntityButton
                                    compact
                                    kind="target"
                                    id={target.id}
                                    label="刪除止盈目標"
                                    description="此操作只會刪除目標，不會建立賣出紀錄。"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-zinc-500">
                          尚未設定止盈目標
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </details>
            </Panel>
          ))
        ) : (
          <Panel>
            <EmptyState
              title={`尚未記錄 ${asset.symbol} 買入`}
              description="建立第一個買入批次後，這裡會顯示持倉、成本、分批賣出與止盈目標。"
              action={<BuyLotEditor assetId={asset.id} symbol={asset.symbol} />}
            />
          </Panel>
        )}
      </div>
    </AppShell>
  );
}






