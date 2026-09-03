export type ComparisonInput = {
  asset: { id: string; symbol: string; name: string; color: string; currency: string };
  points: { timestamp: string; price: number }[];
};

export function buildPriceComparison(inputs: ComparisonInput[], mode: "percent" | "price") {
  const available = inputs.map((input) => ({
    asset: input.asset,
    points: input.points.map((point) => ({ time: Date.parse(point.timestamp), price: point.price }))
      .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.price) && point.price >= 0)
      .sort((a, b) => a.time - b.time),
  })).filter((input) => input.points.length >= 2 && input.points[0].time < input.points.at(-1)!.time);
  const from = available.length ? Math.max(...available.map((input) => input.points[0].time)) : null;
  const to = available.length ? Math.min(...available.map((input) => input.points.at(-1)!.time)) : null;
  const rows: ({ time: number } & Record<string, number>)[] = [];
  if (from === null || to === null || from >= to) return { from, to, rows, series: [] };

  // All lines use the same baseline time. A quote is carried forward, never backward from the future.
  const series = available.map((input) => {
    const base = input.points.filter((point) => point.time <= from).at(-1)!.price;
    const last = input.points.filter((point) => point.time <= to).at(-1)!.price;
    return { ...input, base, last, change: base > 0 ? (last / base - 1) * 100 : null };
  }).filter((input) => mode === "price" || input.base > 0);
  const times = new Set<number>([from, to]);
  for (const input of series) for (const point of input.points) if (point.time >= from && point.time <= to) times.add(point.time);
  const cursors = series.map(() => 0);
  for (const time of [...times].sort((a, b) => a - b)) {
    const row: { time: number } & Record<string, number> = { time };
    series.forEach((input, index) => {
      while (cursors[index] + 1 < input.points.length && input.points[cursors[index] + 1].time <= time) cursors[index]++;
      const price = input.points[cursors[index]].price;
      row[input.asset.id] = mode === "price" ? price : (price / input.base - 1) * 100;
      row[`${input.asset.id}_price`] = price;
    });
    rows.push(row);
  }
  return { from, to, rows, series };
}
