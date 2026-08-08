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

export function AllocationChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (!data.length) return <ChartEmpty text="尚無可顯示的持倉配置" />;
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={2}>
          {data.map((row) => <Cell key={row.name} fill={row.color} stroke="var(--surface)" />)}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const amount = Number(value ?? 0);
            const percent = total > 0 ? (amount / total) * 100 : 0;
            return [`${formatMoney(amount)} · ${percent.toFixed(2)}%`, name];
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
  data: { name: string; realized: number; unrealized: number; color: string }[];
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
        <Bar dataKey="realized" name="已實現" fill="#94a3b8" radius={[3, 3, 0, 0]}>
          {data.map((row) => <Cell key={`realized-${row.name}`} fill={row.color} />)}
        </Bar>
        <Bar dataKey="unrealized" name="未實現" fill="#64748b" fillOpacity={0.58} radius={[3, 3, 0, 0]}>
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
  data: ({ time: string; total: number } & Record<string, string | number>)[];
  series: { key: string; label: string; color: string }[];
}) {
  if (data.length < 2) return <ChartEmpty text="至少需要兩次不同時間的價格更新，才會顯示走勢" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="time" {...axis} minTickGap={24} />
        <YAxis {...axis} width={58} domain={["auto", "auto"]} />
        <Tooltip formatter={(value, name) => [formatMoney(value), name]} contentStyle={tooltipStyle} />
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
            connectNulls
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

