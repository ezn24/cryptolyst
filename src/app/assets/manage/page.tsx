import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AssetIcon } from "@/components/assets/asset-icon";
import { AssetEditor, DeleteEntityButton } from "@/components/management-forms";
import { EmptyState, Input, Panel, Select } from "@/components/ui/primitives";
import { getPortfolioData } from "@/lib/services/portfolio-service";
import { decimalString, money, pct, D } from "@/lib/decimal";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const { assets } = await getPortfolioData();
  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "all";
  const visible = assets.filter(({ asset, metrics }) => {
    const matchesQuery =
      !query ||
      asset.symbol.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query);
    const matchesStatus =
      status === "all" ||
      (status === "holding" && metrics.totalRemainingQuantity.gt(0)) ||
      (status === "closed" && metrics.totalRemainingQuantity.isZero() && asset.buyLots.length > 0) ||
      (status === "inactive" && !asset.isActive);
    return matchesQuery && matchesStatus;
  });

  return (
    <AppShell
      title="幣種投資帳本"
      description={`${assets.length} 種幣種，選擇幣種管理交易、持倉、止盈與分析圖表`}
      actions={<AssetEditor />}
    >
      <Panel>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input name="q" defaultValue={filters.q} placeholder="搜尋代號或名稱" className="pl-9" />
          </div>
          <Select name="status" defaultValue={status} className="sm:w-44">
            <option value="all">所有資產</option>
            <option value="holding">目前持有</option>
            <option value="closed">已完成</option>
            <option value="inactive">已停用</option>
          </Select>
          <button className="h-10 rounded-md bg-white/10 px-4 text-sm font-medium hover:bg-white/15">
            套用
          </button>
        </form>

        {visible.length ? (
          <div className="table-scroll">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-3">資產</th>
                  <th>目前價格</th>
                  <th>剩餘數量</th>
                  <th>平均成本</th>
                  <th>目前市值</th>
                  <th>總損益</th>
                  <th>報酬率</th>
                  <th>批次</th>
                  <th>狀態</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ asset, metrics }) => (
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
                          <Link href={`/assets/${asset.id}`} className="font-semibold text-white hover:text-emerald-300">
                            {asset.symbol}
                          </Link>
                          <div className="text-xs text-zinc-500">{asset.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{money(asset.currentPrice, asset.priceCurrency)}</td>
                    <td>{decimalString(metrics.totalRemainingQuantity)}</td>
                    <td>{money(metrics.averageEntryPrice)}</td>
                    <td>{money(metrics.currentMarketValue)}</td>
                    <td className={D(metrics.totalProfit).gte(0) ? "text-emerald-300" : "text-rose-300"}>
                      {money(metrics.totalProfit)}
                    </td>
                    <td className={D(metrics.totalReturnPercent).gte(0) ? "text-emerald-300" : "text-rose-300"}>
                      {pct(metrics.totalReturnPercent)}
                    </td>
                    <td>{asset.buyLots.length}</td>
                    <td>
                      <span className={asset.isActive ? "text-emerald-300" : "text-zinc-500"}>
                        {asset.isActive ? "啟用" : "停用"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <AssetEditor
                          compact
                          asset={{
                            id: asset.id,
                            symbol: asset.symbol,
                            name: asset.name,
                            priceSource: asset.priceSource,
                            currentPrice: asset.currentPrice.toString(),
                            coingeckoId: asset.coingeckoId ?? "",
                            binanceSymbol: asset.binanceSymbol ?? "",
                            color: asset.color,
                            iconUrl: asset.iconUrl ?? "",
                            isActive: asset.isActive,
                          }}
                        />
                        <DeleteEntityButton
                          compact
                          kind="asset"
                          id={asset.id}
                          label="刪除或停用資產"
                          description={
                            asset.buyLots.length
                              ? "此資產已有交易紀錄，因此不會刪除資料，只會改為停用。"
                              : "此資產沒有交易紀錄，確認後會永久刪除。"
                          }
                        />
                        <Link
                          href={`/assets/${asset.id}`}
                          title="開啟資產"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={assets.length ? "沒有符合條件的資產" : "尚未建立資產"}
            description={assets.length ? "調整搜尋或狀態篩選。" : "先建立一種加密貨幣，再記錄第一筆買入。"}
            action={!assets.length ? <AssetEditor /> : undefined}
          />
        )}
      </Panel>
    </AppShell>
  );
}

