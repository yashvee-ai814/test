import { useMemo, useState } from "react";

export type LineSeries = { label: string; values: (number | null)[] };

type LineChartProps = {
  periods: string[];
  series: LineSeries[];
  valueSuffix?: string;
  height?: number;
};

const SERIES_COLORS = [
  "var(--viz-series-1)",
  "var(--viz-series-2)",
  "var(--viz-series-3)",
  "var(--viz-series-4)",
  "var(--viz-series-5)",
  "var(--viz-series-6)",
  "var(--viz-series-7)",
  "var(--viz-series-8)",
];

const W = 640;
const H = 240;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 40 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const range = max - min;
  const rawStep = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return ticks;
}

function shortPeriod(period: string): string {
  const [, month] = period.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(month)] ?? period;
}

export function LineChart({ periods, series, valueSuffix = "", height = H }: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { yTicks, yMin, yMax } = useMemo(() => {
    const allValues = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const ticks = niceTicks(min, max);
    return { yTicks: ticks, yMin: ticks[0], yMax: ticks[ticks.length - 1] };
  }, [series]);

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;

  const x = (i: number) => MARGIN.left + (periods.length <= 1 ? 0 : (i / (periods.length - 1)) * plotW);
  const y = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - MARGIN.left) / plotW) * (periods.length - 1));
    setHoverIndex(Math.max(0, Math.min(periods.length - 1, idx)));
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={W - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--viz-ink-muted)">
              {tick}
              {valueSuffix}
            </text>
          </g>
        ))}

        <line
          x1={MARGIN.left}
          x2={W - MARGIN.right}
          y1={MARGIN.top + plotH}
          y2={MARGIN.top + plotH}
          stroke="var(--viz-axis)"
          strokeWidth={1}
        />

        {periods.map((p, i) =>
          i % Math.ceil(periods.length / 6) === 0 ? (
            <text key={p} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--viz-ink-muted)">
              {shortPeriod(p)}
            </text>
          ) : null,
        )}

        {series.map((s, si) => {
          const points = s.values
            .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
            .filter((p): p is string => p !== null);
          return (
            <g key={s.label}>
              <polyline
                points={points.join(" ")}
                fill="none"
                style={{ stroke: SERIES_COLORS[si % SERIES_COLORS.length] }}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) =>
                v === null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={hoverIndex === i ? 5 : 4}
                    style={{ fill: SERIES_COLORS[si % SERIES_COLORS.length] }}
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                  />
                ),
              )}
            </g>
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={MARGIN.top}
            y2={MARGIN.top + plotH}
            stroke="var(--viz-axis)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hoverIndex !== null && (
        <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="font-medium text-slate-500 dark:text-slate-400">{periods[hoverIndex]}</div>
          {series.map((s, si) => (
            <div key={s.label} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }}
              />
              {s.label}: {s.values[hoverIndex] ?? "—"}
              {valueSuffix}
            </div>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s, si) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
