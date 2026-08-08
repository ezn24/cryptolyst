import { Clock3, RefreshCw } from "lucide-react";
import { updatePricesAction, updateSinglePriceAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ManualPriceForm } from "@/components/forms";
import { AssetEditor } from "@/components/management-forms";
import { Button, EmptyState, Panel } from "@/components/ui/primitives";
import { prisma } from "@/lib/db";
import { money, pct } from "@/lib/decimal";

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });
  // This force-dynamic server page intentionally evaluates staleness per request.
  // eslint-disable-next-line react-hooks/purity
  const staleBefore = Date.now() - 15 * 60 * 1000;
  return (
    <AppShell title="價格管理" description="即時報價、來源設定與手動覆寫">
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-500">API 失敗時會保留最後有效價格，不會改為 0。</div>
          <form action={updatePricesAction}>
            <Button type="submit"><RefreshCw className="h-4 w-4" />更新全部價格</Button>
          </form>
        </div>
        {assets.length ? (
          <div className="table-scroll">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="pb-3">資產</th><th>即時價格</th><th>24h</th><th>來源</th><th>最後更新</th><th>資料狀態</th><th>手動價格</th><th className="text-right">操作</th></tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const stale = !asset.priceUpdatedAt || asset.priceUpdatedAt.getTime() < staleBefore;
                  return (
                    <tr key={asset.id} className="border-t border-white/10">
                      <td className="py-3"><span className="font-semibold">{asset.symbol}</span><div className="text-xs text-zinc-500">{asset.name}</div></td>
                      <td>{money(asset.currentPrice, asset.priceCurrency)}</td>
                      <td className={asset.priceChange24h.gte(0) ? "text-emerald-300" : "text-rose-300"}>{pct(asset.priceChange24h)}</td>
                      <td>{asset.priceSource}</td>
                      <td>{asset.priceUpdatedAt?.toLocaleString("zh-TW") ?? "尚未更新"}</td>
                      <td><span className={stale ? "inline-flex items-center gap-1 text-amber-300" : "text-emerald-300"}>{stale ? <><Clock3 className="h-3.5 w-3.5" />價格已過期</> : "最新"}</span></td>
                      <td><ManualPriceForm assetId={asset.id} /></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {asset.priceSource !== "manual" ? (
                            <form action={updateSinglePriceAction}>
                              <input type="hidden" name="assetId" value={asset.id} />
                              <button type="submit" title="更新此資產" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
                            </form>
                          ) : null}
                          <AssetEditor compact asset={{ id: asset.id, symbol: asset.symbol, name: asset.name, priceSource: asset.priceSource, currentPrice: asset.currentPrice.toString(), coingeckoId: asset.coingeckoId ?? "", binanceSymbol: asset.binanceSymbol ?? "", iconUrl: asset.iconUrl ?? "", color: asset.color, isActive: asset.isActive }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="尚未建立資產" description="建立資產後即可設定報價來源與手動價格。" action={<AssetEditor />} />
        )}
      </Panel>
    </AppShell>
  );
}
