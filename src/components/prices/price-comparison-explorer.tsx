"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildPriceComparison, type ComparisonInput } from "@/lib/price-comparison";
import type { PriceRange } from "@/lib/price-history";
import { cn } from "@/lib/utils";

type AssetOption = Omit<ComparisonInput["asset"], "currency">;
type Result = { key: string; data: ComparisonInput[]; errors: { id: string; message: string }[] };
const amount = (value: number, currency: string) => `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: Math.abs(value) < 1 ? 8 : 2 }).format(value)} ${currency}`;
const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export function PriceComparisonExplorer({ assets, range }: { assets: AssetOption[]; range: PriceRange }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [mode, setMode] = useState<"percent" | "price">("percent");
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const ids = JSON.stringify(assets.map((asset) => asset.id));
  const key = JSON.stringify([ids, range, reload]);
  const current = result?.key === key ? result : null;
  const loading = !current;

  useEffect(() => {
    const controller = new AbortController();
    const assetIds: string[] = JSON.parse(ids);
    void Promise.all(assetIds.map(async (id) => {
      try {
        const response = await fetch(`/api/prices/history?assetId=${encodeURIComponent(id)}&range=${range}`, { signal: controller.signal });
        if (!response.ok) throw new Error("歷史報價載入失敗");
        const data: ComparisonInput = await response.json();
        return { id, data };
      } catch (error) {
        return { id, error: error instanceof Error ? error.message : "歷史報價載入失敗" };
      }
    })).then((results) => {
      if (controller.signal.aborted) return;
      setResult({ key, data: results.flatMap((item) => item.data ? [item.data] : []), errors: results.flatMap((item) => item.error ? [{ id: item.id, message: item.error }] : []) });
    });
    return () => controller.abort();
  }, [ids, range, key]);

  const selected = assets.filter((asset) => !hidden.includes(asset.id));
  const comparison = useMemo(() => buildPriceComparison((current?.data ?? []).filter((item) => !hidden.includes(item.asset.id)), mode), [current, hidden, mode]);
  const mixedCurrency = new Set(comparison.series.map((item) => item.asset.currency)).size > 1;
  const currency = comparison.series[0]?.asset.currency ?? "USDT";
  const empty = !selected.length ? "尚未選擇幣種" : !comparison.series.length ? "所選幣種沒有足夠的共同期間報價" : mode === "price" && mixedCurrency ? "原始價格模式僅支援相同報價幣別" : null;

  return (
    <div className="price-comparison min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex min-w-0 flex-wrap gap-x-4 gap-y-3">
          <legend className="sr-only">比較幣種</legend>
          {assets.map((asset) => (
            <label key={asset.id} className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={!hidden.includes(asset.id)} onChange={(event) => setHidden((previous) => event.target.checked ? previous.filter((id) => id !== asset.id) : [...previous, asset.id])} className="h-4 w-4 accent-emerald-500" />
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
              {asset.symbol}
            </label>
          ))}
        </fieldset>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--control)] p-1" role="group" aria-label="走勢比較模式">
            {(["percent", "price"] as const).map((option) => (
              <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={cn("h-8 rounded px-3 text-xs font-semibold", mode === option ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted-strong)]")}>
                {option === "percent" ? "漲跌幅 %" : "原始價格"}
              </button>
            ))}
          </div>
          <button type="button" aria-label="重新載入比較走勢" title="重新載入比較走勢" disabled={loading} onClick={() => setReload((value) => value + 1)} className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] text-[var(--muted-strong)] disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      <div className="mt-3 min-h-5 text-xs text-[var(--muted)]">
        {comparison.series.length && comparison.from !== null && comparison.to !== null ? `共同報價區間：${new Date(comparison.from).toLocaleString("zh-TW")} - ${new Date(comparison.to).toLocaleString("zh-TW")} · ${mode === "percent" ? "共同起點 = 0%" : currency}` : ""}
      </div>
      <div className="mt-3 h-[360px] min-w-0 sm:h-[400px]" aria-label="多幣種歷史走勢">
        {loading ? <div role="status" className="flex h-full items-center justify-center gap-2 text-sm text-[var(--muted)]"><LoaderCircle className="h-4 w-4 animate-spin" />載入比較走勢</div>
          : empty ? <div role="status" className="grid h-full place-items-center text-sm text-[var(--muted)]">{empty}</div>
            : <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparison.rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} tickCount={6} tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickLine={false} stroke="var(--chart-axis)" minTickGap={36} tickFormatter={(value) => new Date(value).toLocaleString("zh-TW", range === "24H" ? { hour: "2-digit", minute: "2-digit" } : range === "7D" ? { month: "numeric", day: "numeric", hour: "2-digit" } : { month: "numeric", day: "numeric" })} />
                <YAxis domain={["auto", "auto"]} width={70} tick={{ fill: "var(--chart-axis)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => mode === "percent" ? `${Number(value).toFixed(1)}%` : new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 2 }).format(value)} />
                {mode === "percent" ? <ReferenceLine y={0} stroke="var(--chart-axis)" strokeDasharray="4 4" /> : null}
                <Tooltip contentStyle={{ background: "var(--chart-tooltip)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)" }} labelFormatter={(label) => new Date(Number(label)).toLocaleString("zh-TW")} formatter={(value, name, item) => {
                  const series = comparison.series.find((input) => input.asset.id === item.dataKey);
                  const quote = amount(Number(item.payload?.[`${item.dataKey}_price`]), series?.asset.currency ?? currency);
                  return [mode === "percent" ? `${percent(Number(value))} · ${quote}` : quote, name];
                }} />
                {comparison.series.map(({ asset }) => <Line key={asset.id} dataKey={asset.id} name={asset.symbol} stroke={assets.find((item) => item.id === asset.id)?.color ?? asset.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls={false} />)}
              </LineChart>
            </ResponsiveContainer>}
      </div>
      {!loading ? <div className="table-scroll mt-4 border-t border-[var(--border)]">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="text-xs text-[var(--muted)]"><tr><th className="py-3">幣種</th><th>區間漲跌</th><th>比較起價</th><th>比較終價</th></tr></thead>
          <tbody>{selected.map((asset) => {
            const series = comparison.series.find((item) => item.asset.id === asset.id);
            const error = current?.errors.find((item) => item.id === asset.id);
            return <tr key={asset.id} className="border-t border-[var(--border)]">
              <td className="py-3 font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: asset.color }} />{asset.symbol}</td>
              {series ? <><td className={series.change === null ? "" : series.change < 0 ? "text-[var(--comparison-negative)]" : "text-[var(--comparison-positive)]"}>{series.change === null ? "資料不足" : percent(series.change)}</td><td>{amount(series.base, series.asset.currency)}</td><td>{amount(series.last, series.asset.currency)}</td></>
                : <td colSpan={3} className="text-[var(--muted)]">{error ? "載入失敗" : "共同期間報價不足"}</td>}
            </tr>;
          })}</tbody>
        </table>
      </div> : null}
    </div>
  );
}
