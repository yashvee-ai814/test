import { useState } from "react";
import type { TraceCall } from "../../types";

const CATEGORY_STYLE: Record<string, string> = {
  json: "border-l-sky-500",
  file: "border-l-violet-500",
  sql: "border-l-brand-600",
  vector: "border-l-emerald-500",
  math: "border-l-amber-500",
  other: "border-l-slate-400",
};

const CATEGORY_BADGE: Record<string, string> = {
  json: "bg-sky-500",
  file: "bg-violet-500",
  sql: "bg-brand-600",
  vector: "bg-emerald-500",
  math: "bg-amber-500",
  other: "bg-slate-400",
};

const TOOL_CATALOG: { category: string; label: string; tools: { name: string; description: string }[] }[] = [
  {
    category: "json",
    label: "Direct JSON query",
    tools: [
      { name: "get_competitor_information", description: "Quarterly premium benchmarking vs 6 competitors" },
      { name: "get_previous_pricing_actions", description: "Historical pricing actions + logged impact" },
      { name: "get_customer_feedback_metrics", description: "Monthly NPS/CSAT/complaint volumes" },
      { name: "list_market_intelligence", description: "Structured index of market intel items" },
    ],
  },
  {
    category: "file",
    label: "Direct file read",
    tools: [{ name: "get_market_intelligence_doc", description: "Full raw text of one market intel item" }],
  },
  {
    category: "sql",
    label: "Typed SQLite query",
    tools: [
      { name: "get_claims_performance", description: "Monthly claims by segment" },
      { name: "get_regional_weather_claims", description: "Weather-related claims by region" },
      { name: "get_conversion_performance", description: "Quote-to-bind conversion by channel/segment" },
    ],
  },
  {
    category: "vector",
    label: "Vector semantic search",
    tools: [
      {
        name: "search_unstructured_sources",
        description: "Semantic search over market intel, feedback, pricing rationale",
      },
    ],
  },
  {
    category: "math",
    label: "Deterministic math",
    tools: [
      { name: "calculate_percentage_change", description: "Exact % change between two values" },
      { name: "calculate_trend", description: "Direction/magnitude of a time series" },
      { name: "calculate_summary_stats", description: "Mean/median/min/max/stdev of a series" },
    ],
  },
];

function unwrapToolResult(result: unknown): unknown {
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object" && result[0] !== null) {
    const block = result[0] as Record<string, unknown>;
    if (typeof block.text === "string") {
      try {
        return JSON.parse(block.text);
      } catch {
        return block.text;
      }
    }
  }
  return result;
}

function highlightJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-sky-600 dark:text-sky-400";
      if (/^"/.test(match)) {
        cls = /:$/.test(match)
          ? "text-violet-600 dark:text-violet-400"
          : "text-emerald-600 dark:text-emerald-400";
      } else if (/true|false/.test(match)) {
        cls = "text-amber-600 dark:text-amber-400";
      } else if (/null/.test(match)) {
        cls = "text-slate-400";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre
      className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-100 p-2 font-mono text-[11px] leading-relaxed dark:bg-slate-900"
      dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
    />
  );
}

function TraceCard({ call }: { call: TraceCall }) {
  const [open, setOpen] = useState(true);
  const hasArgs = call.args && Object.keys(call.args).length > 0;

  return (
    <div
      className={`rounded-lg border border-slate-200 border-l-4 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/60 ${CATEGORY_STYLE[call.category]}`}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${CATEGORY_BADGE[call.category]}`}
        >
          {call.category}
        </span>
        <code className="flex-1 truncate font-mono text-slate-700 dark:text-slate-200">{call.tool}</code>
        {call.result === undefined ? (
          <span className="text-amber-600 dark:text-amber-400">running…</span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {hasArgs && (
            <div>
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Arguments</div>
              <JsonBlock value={call.args} />
            </div>
          )}
          {call.result !== undefined && (
            <div>
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Result</div>
              <JsonBlock value={unwrapToolResult(call.result)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraceTab({ trace }: { trace: TraceCall[] }) {
  if (trace.length === 0) {
    return <p className="px-1 text-sm text-slate-400">Ask a question to see the retrieval trace here.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {trace.map((call) => (
        <TraceCard key={call.id} call={call} />
      ))}
    </div>
  );
}

function CatalogTab() {
  return (
    <div className="flex flex-col gap-4">
      {TOOL_CATALOG.map((group) => (
        <div key={group.category}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${CATEGORY_BADGE[group.category]}`} />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.label}
            </h4>
          </div>
          <ul className="space-y-1.5">
            {group.tools.map((tool) => (
              <li key={tool.name} className="text-xs">
                <code className="font-mono text-slate-700 dark:text-slate-200">{tool.name}</code>
                <p className="text-slate-500 dark:text-slate-400">{tool.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ActivityPanel({ trace, width }: { trace: TraceCall[]; width: number }) {
  const [tab, setTab] = useState<"trace" | "catalog">("trace");

  return (
    <aside
      style={{ width }}
      className="flex shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {(["trace", "catalog"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-600 dark:text-brand-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {t === "trace" ? "Trace" : "Tool catalog"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">{tab === "trace" ? <TraceTab trace={trace} /> : <CatalogTab />}</div>
    </aside>
  );
}
