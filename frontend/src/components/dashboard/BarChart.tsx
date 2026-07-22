export type BarDatum = { label: string; value: number };

type BarChartProps = {
  data: BarDatum[];
  highlightLabel?: string;
  colors?: Record<string, string>;
  valuePrefix?: string;
  valueSuffix?: string;
};

export function BarChart({ data, highlightLabel, colors, valuePrefix = "", valueSuffix = "" }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const widthPct = (d.value / max) * 100;
        const isHighlight = d.label === highlightLabel;
        const color = colors?.[d.label] ?? (isHighlight ? "var(--viz-series-8)" : "var(--viz-series-1)");
        return (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-28 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300" title={d.label}>
              {d.label}
            </div>
            <div className="relative h-4 flex-1">
              <div className="h-4 rounded-r" style={{ width: `${widthPct}%`, background: color, maxHeight: 24 }} />
            </div>
            <div className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
              {valuePrefix}
              {d.value.toLocaleString()}
              {valueSuffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}
