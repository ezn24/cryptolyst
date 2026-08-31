"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarRange, LoaderCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PRICE_RANGES, type PriceRange } from "@/lib/price-history";
import { cn } from "@/lib/utils";

type AssetOption = { id: string; symbol: string; name: string; color: string };
type HistoryResponse = {
  asset: AssetOption & { currency: string };
  range: PriceRange;
  pointCount: number;
  coverage: { from: string; to: string } | null;
  summary: { first: number; last: number; high: number; low: number; change: number; changePercent: number } | null;
  points: Array<{ timestamp: string; price: number; source: string }>;
};

const rangeLabels: Record<PriceRange, string> = {
  "24H": "24 小時",
  "7D": "7 天",
  "30D": "30 天",
  "90D": "90 天",
  "1Y": "1 年",
  ALL: "全部",
};

function price(value: number | undefined, currency = "USDT") {
  if (value === undefined) return "-";
  return `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: value < 1 ? 8 : 2 }).format(value)} ${currency}`;
}

function dateLabel(timestamp: string, range: PriceRange) {
  const date = new Date(timestamp);
  if (range === "24H") return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  if (range === "7D" || range === "30D") return date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
  return date.toLocaleDateString("zh-TW", { year: "2-digit", month: "numeric", day: "numeric" });
}

function HistoryMetric({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="min-w-0 border-l-2 border-[var(--border)] pl-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">{icon}{label}</div>
      <div className="mt-1 truncate text-base font-semibold text-[var(--foreground)]">{value}</div>
      {detail ? <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{detail}</div> : null}
    </div>
  );
}

export function PriceHistoryExplorer({
  assets,
  initialAssetId,
  compact = false,
}: {
  assets: AssetOption[];
  initialAssetId?: string;
  compact?: boolean;
}) {
  const [assetId, setAssetId] = useState(initialAssetId ?? assets[0]?.id ?? "");
  const [range, setRange] = useState<PriceRange>("30D");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!assetId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/prices/history?assetId=${encodeURIComponent(assetId)}&range=${range}`, { signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "無法載入價格歷史");
      setData(body);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "無法載入價格歷史");
      setData(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [assetId, range]);

  useEffect(() => {
    const controller = new AbortController();
    // The explorer intentionally reloads its remote series when the selected asset or range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  const chartData = useMemo(() => data?.points.map((point) => ({
    ...point,
    label: dateLabel(point.timestamp, range),
  })) ?? [], [data, range]);
  const color = data?.asset.color || assets.find((asset) => asset.id === assetId)?.color || "#38bdf8";
  const change = data?.summary?.changePercent ?? 0;
  const currency = data?.asset.currency ?? "USDT";
  const coverage = data?.coverage
    ? `${new Date(data.coverage.from).toLocaleDateString("zh-TW")} - ${new Date(data.coverage.to).toLocaleDateString("zh-TW")}`
    : "尚無資料";

  if (!assets.length) return <div className="grid min-h-64 place-items-center text-sm text-[var(--muted)]">尚未建立資產</div>;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          {assets.length > 1 ? (
            <label className="grid min-w-48 gap-1 text-xs text-[var(--muted)]">
              幣種
              <select
                value={assetId}
                onChange={(event) => { setAssetId(event.target.value); setData(null); }}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-emerald-400"
              >
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}
              </select>
            </label>
          ) : null}
          <div>
            <div className="mb-1 text-xs text-[var(--muted)]">時間跨度</div>
            <div className="flex max-w-full overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--control)] p-1" aria-label="選擇價格時間跨度">
              {PRICE_RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setRange(option); setData(null); }}
                  className={cn(
                    "h-8 shrink-0 rounded px-2.5 text-xs font-semibold transition",
                    option === range ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted-strong)] hover:bg-white/10 hover:text-[var(--foreground)]",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          title="重新載入歷史價格"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--control)] text-[var(--muted-strong)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <HistoryMetric label="最新價格" value={price(data?.summary?.last, currency)} detail={data?.asset.symbol} />
        <HistoryMetric
          label={`${rangeLabels[range]}漲跌`}
          value={`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
          detail={data?.summary ? `${data.summary.change >= 0 ? "+" : ""}${price(data.summary.change, currency)}` : "-"}
          icon={change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        />
        <HistoryMetric label="區間最高" value={price(data?.summary?.high, currency)} />
        <HistoryMetric label="區間最低" value={price(data?.summary?.low, currency)} />
        <HistoryMetric label="價格資料" value={`${data?.pointCount ?? 0} 點`} detail={coverage} icon={<CalendarRange className="h-3.5 w-3.5" />} />
      </div>

      <div className={cn("relative mt-5 w-full", compact ? "h-[300px]" : "h-[380px]")}>
        {loading && !data ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-[var(--muted)]"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />載入價格歷史</div>
        ) : error ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-rose-400">{error}</div>
        ) : chartData.length < 2 ? (
          <div className="absolute inset-0 grid place-items-center text-center text-sm text-[var(--muted)]">目前只有一個價格點，下一次價格更新後會開始顯示走勢。</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} minTickGap={36} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickLine={false} axisLine={false} width={72} tickFormatter={(value) => new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 2 }).format(value)} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)" }}
                labelFormatter={(_, payload) => payload[0]?.payload?.timestamp ? new Date(payload[0].payload.timestamp).toLocaleString("zh-TW") : ""}
                formatter={(value) => [price(Number(value), currency), "價格"]}
              />
              <Area type="monotone" dataKey="price" stroke="none" fill={color} fillOpacity={0.12} isAnimationActive={false} />
              <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
