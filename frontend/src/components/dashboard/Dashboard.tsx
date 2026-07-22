import { useEffect, useState } from "react";
import { API_BASE } from "../../api";
import { StatTile } from "./StatTile";
import { LineChart, type LineSeries } from "./LineChart";
import { BarChart } from "./BarChart";

type DashboardData = {
  stats: {
    avg_loss_ratio_young_driver_pct: number;
    latest_nps: number;
    total_policies_in_force: number;
    pricing_actions_logged: number;
  };
  claims_trend: { periods: string[]; series: LineSeries[] };
  conversion_trend: { periods: string[]; series: LineSeries[] };
  competitor_snapshot: {
    quarter: string;
    profile_id: string;
    profile_description: string;
    premiums: { label: string; value: number }[];
    aviva_market_rank: number;
    aviva_vs_market_median_pct: number;
  };
  feedback_trend: { periods: string[]; nps: number[]; csat: number[] };
  market_intelligence_sentiment: { label: string; value: number }[];
  pricing_actions: {
    action_id: string;
    date: string;
    segment_affected: string;
    action_type: string;
    change_pct: number | null;
    rationale: string;
  }[];
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "var(--viz-series-2)",
  neutral: "var(--viz-series-4)",
  negative: "var(--viz-series-8)",
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-slate-400">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`Dashboard request failed: ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return <div className="p-6 text-sm text-rose-600 dark:text-rose-400">Failed to load dashboard: {error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-sm text-slate-400">Loading data…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
        Data <span className="text-gradient">Dashboard</span>
      </h2>
      <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">
        The raw source data the copilot retrieves from — no LLM involved, straight from the MCP tools.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Avg loss ratio — Young Driver"
          value={`${data.stats.avg_loss_ratio_young_driver_pct}%`}
          sublabel="12-month average"
        />
        <StatTile label="Latest NPS" value={String(data.stats.latest_nps)} sublabel="most recent month" />
        <StatTile
          label="Policies in force"
          value={data.stats.total_policies_in_force.toLocaleString()}
          sublabel="latest month, all segments"
        />
        <StatTile label="Pricing actions logged" value={String(data.stats.pricing_actions_logged)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Loss ratio by segment" subtitle="12-month trend, % of earned premium">
          <LineChart periods={data.claims_trend.periods} series={data.claims_trend.series} valueSuffix="%" />
        </Panel>

        <Panel title="Conversion rate by channel" subtitle="12-month trend, averaged across segments">
          <LineChart periods={data.conversion_trend.periods} series={data.conversion_trend.series} valueSuffix="%" />
        </Panel>

        <Panel
          title="Competitor premiums — young driver profile"
          subtitle={`${data.competitor_snapshot.profile_description} · ${data.competitor_snapshot.quarter}`}
        >
          <BarChart data={data.competitor_snapshot.premiums} highlightLabel="Aviva" valuePrefix="£" />
          <p className="mt-3 text-xs text-slate-400">
            Aviva ranked {data.competitor_snapshot.aviva_market_rank} of {data.competitor_snapshot.premiums.length},{" "}
            {data.competitor_snapshot.aviva_vs_market_median_pct}% vs. market median.
          </p>
        </Panel>

        <Panel title="Market intelligence sentiment" subtitle="18 tracked items, by sentiment">
          <BarChart data={data.market_intelligence_sentiment} colors={SENTIMENT_COLORS} />
        </Panel>
      </div>

      <Panel title="Previous pricing actions">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                <th className="py-1.5 pr-3 font-medium">Segment</th>
                <th className="py-1.5 pr-3 font-medium">Action</th>
                <th className="py-1.5 pr-3 font-medium">Change</th>
                <th className="py-1.5 font-medium">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {data.pricing_actions.map((a) => (
                <tr key={a.action_id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">
                    {a.date}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                    {a.segment_affected}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                    {a.action_type}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-slate-700 dark:text-slate-200">
                    {a.change_pct === null ? "—" : `${a.change_pct > 0 ? "+" : ""}${a.change_pct}%`}
                  </td>
                  <td className="py-1.5 text-slate-500 dark:text-slate-400">{a.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
