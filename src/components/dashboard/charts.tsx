"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--chart-tooltip)",
  border: "1px solid var(--chart-grid)",
  borderRadius: 6,
  color: "var(--foreground)",
};
const axis = { stroke: "var(--chart-axis)", tickLine: false } as const;

function formatMoney(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

type Allocation = { name: string; value: number; color: string }[];

export function AllocationChart({ data, baseline }: { data: Allocation; baseline?: Allocation }) {
  if (!data.length && !baseline?.length) return <ChartEmpty text="尚無可顯示的持倉配置" />;
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const baselineTotal = baseline?.reduce((sum, row) => sum + row.value, 0) ?? 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        {baseline?.length ? (
          <Pie data={baseline.map((row) => ({ ...row, period: "期初", percent: baselineTotal > 0 ? row.value / baselineTotal * 100 : 0 }))} dataKey="value" nameKey="name" innerRadius={28} outerRadius={51} paddingAngle={2} legendType="none">
            {baseline.map((row) => <Cell key={row.name} fill={row.color} stroke="var(--surface)" />)}
          </Pie>
        ) : null}
        <Pie data={data.map((row) => ({ ...row, period: "目前", percent: total > 0 ? row.value / total * 100 : 0 }))} dataKey="value" nameKey="name" innerRadius={baseline ? 60 : 56} outerRadius={92} paddingAngle={2}>
          {data.map((row) => <Cell key={row.name} fill={row.color} stroke="var(--surface)" />)}
        </Pie>
        <Tooltip
          formatter={(value, name, item) => {
            const amount = Number(value ?? 0);
            const percent = Number(item.payload?.percent ?? 0);
            return [`${formatMoney(amount)} · ${percent.toFixed(2)}%`, `${item.payload?.period ?? "目前"} ${name}`];
          }}
          contentStyle={tooltipStyle}
        />
        <Legend wrapperStyle={{ color: "var(--foreground)", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProfitBarChart({
  data,
}: {
  data: { name: string; realized: number; unrealized: number | null; color: string }[];
}) {
  if (!data.length) return <ChartEmpty text="尚無損益資料" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} width={58} />
        <Tooltip
          formatter={(value, name) => [formatMoney(value), name]}
          cursor={{ fill: "var(--chart-cursor)" }}
          contentStyle={tooltipStyle}
        />
        <Legend wrapperStyle={{ color: "var(--foreground)", fontSize: 12 }} />
        <Bar dataKey="realized" name="區間已實現" fill="#94a3b8" radius={[3, 3, 0, 0]}>
          {data.map((row) => <Cell key={`realized-${row.name}`} fill={row.color} />)}
        </Bar>
        <Bar dataKey="unrealized" name="未實現變化" fill="#64748b" fillOpacity={0.58} radius={[3, 3, 0, 0]}>
          {data.map((row) => <Cell key={`unrealized-${row.name}`} fill={row.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PortfolioLineChart({
  data,
  series,
}: {
  data: ({ time: string; total: number | null } & Record<string, string | number | null>)[];
  series: { key: string; label: string; color: string }[];
}) {
  if (data.length < 2 || !data.some((row) => row.total !== null)) return <ChartEmpty text="此期間缺少完整持倉報價" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data.map((row) => ({ ...row, timestamp: new Date(row.time).getTime() }))}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} {...axis} minTickGap={24} tickFormatter={(value) => new Date(value).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
        <YAxis {...axis} width={58} domain={["auto", "auto"]} />
        <Tooltip labelFormatter={(label) => new Date(Number(label)).toLocaleString("zh-TW")} formatter={(value, name) => [value == null ? "資料不足" : formatMoney(value), name]} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: "var(--foreground)", fontSize: 12 }} />
        <Line
          dataKey="total"
          name="總持倉"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
        {series.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            strokeWidth={1.75}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return <div className="flex h-64 items-center justify-center px-5 text-center text-sm text-[var(--muted)]">{text}</div>;
}

