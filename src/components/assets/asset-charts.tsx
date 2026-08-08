"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type AssetChartRow = {
  name: string;
  bought: number;
  sold: number;
  remaining: number;
  cost: number;
  marketValue: number;
  realized: number;
  unrealized: number;
  buyPrice: number;
  currentPrice: number;
  targetPrice: number | null;
};

const tooltipStyle = { background: "var(--chart-tooltip)", border: "1px solid var(--chart-grid)", borderRadius: 6, color: "var(--foreground)" };
const axis = { stroke: "var(--chart-axis)", tickLine: false } as const;
const legendStyle = { color: "var(--foreground)", fontSize: 12 };
const formatQuantity = (value: unknown) => Number(value ?? 0).toLocaleString("zh-TW", { maximumFractionDigits: 8 });
const formatMoney = (value: unknown) => `${Number(value ?? 0).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

function ChartFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-t border-[var(--border)] pt-4">
      <div className="px-1"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-[var(--muted)]">{description}</p></div>
      <div className="mt-3 h-[250px] w-full">{children}</div>
    </section>
  );
}

export function AssetCharts({ data, symbol }: { data: AssetChartRow[]; symbol: string }) {
  if (!data.length) return null;
  return (
    <div className="mt-5 grid gap-x-5 gap-y-6 lg:grid-cols-2">
      <ChartFrame title="批次數量" description={`${symbol} 各批次已賣與剩餘數量`}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={60} />
          <Tooltip formatter={(value, name) => [formatQuantity(value), name]} contentStyle={tooltipStyle} cursor={{ fill: "var(--chart-cursor)" }} /><Legend wrapperStyle={legendStyle} />
          <Bar dataKey="sold" name="已賣" stackId="quantity" fill="#38bdf8" /><Bar dataKey="remaining" name="剩餘" stackId="quantity" fill="#34d399" radius={[3, 3, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="批次損益" description="每個批次的已實現與未實現損益；負值顯示紅色">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={60} />
          <Tooltip formatter={(value, name) => [formatMoney(value), name]} contentStyle={tooltipStyle} cursor={{ fill: "var(--chart-cursor)" }} /><Legend wrapperStyle={legendStyle} />
          <Bar dataKey="realized" name="已實現" fill="#34d399" radius={[3, 3, 0, 0]}>{data.map((row) => <Cell key={`r-${row.name}`} fill={row.realized >= 0 ? "#34d399" : "#fb7185"} />)}</Bar>
          <Bar dataKey="unrealized" name="未實現" fill="#22d3ee" radius={[3, 3, 0, 0]}>{data.map((row) => <Cell key={`u-${row.name}`} fill={row.unrealized >= 0 ? "#22d3ee" : "#f43f5e"} />)}</Bar>
        </BarChart></ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="成本與市值" description="每個批次的剩餘成本與目前市場價值">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={60} />
          <Tooltip formatter={(value, name) => [formatMoney(value), name]} contentStyle={tooltipStyle} cursor={{ fill: "var(--chart-cursor)" }} /><Legend wrapperStyle={legendStyle} />
          <Bar dataKey="cost" name="剩餘成本" fill="#fbbf24" radius={[3, 3, 0, 0]} /><Bar dataKey="marketValue" name="目前市值" fill="#34d399" radius={[3, 3, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="價格與止盈" description="買入價、目前價格與最近的止盈目標">
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={60} domain={["auto", "auto"]} />
          <Tooltip formatter={(value, name) => [formatMoney(value), name]} contentStyle={tooltipStyle} /><Legend wrapperStyle={legendStyle} />
          <Line dataKey="buyPrice" name="買入價" stroke="#fbbf24" strokeWidth={2} /><Line dataKey="currentPrice" name="目前價格" stroke="#34d399" strokeWidth={2} dot={false} /><Line dataKey="targetPrice" name="止盈價" stroke="#38bdf8" strokeWidth={2} connectNulls />
        </ComposedChart></ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
