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

const AGENT_LABELS: Record<string, string> = {
  market: "Market Intelligence",
  claims: "Claims Analysis",
  conversion: "Conversion Analysis",
  recommend: "Recommendation",
};

const AGENT_STYLE: Record<string, { dot: string; text: string }> = {
  market: { dot: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300" },
  claims: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300" },
  conversion: { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300" },
  recommend: { dot: "bg-orange-500", text: "text-orange-700 dark:text-orange-300" },
};

const DEFAULT_AGENT_STYLE = { dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-300" };

const AGENT_CATALOG: { key: string; name: string; role: string; skills: string[]; tools: string[] }[] = [
  {
    key: "orchestrate",
    name: "Orchestration Agent",
    role: "Entry point for every question. Decides which of the 3 specialists below are relevant and routes to them in parallel — never retrieves data itself.",
    skills: ["orchestrate_flow"],
    tools: [],
  },
  {
    key: "market",
    name: "Market Intelligence Agent",
    role: "Competitor moves, regulatory/market news, sentiment.",
    skills: ["retrieve_information", "summarise_findings", "highlight_trends"],
    tools: ["list_market_intelligence", "get_market_intelligence_doc", "search_unstructured_sources"],
  },
  {
    key: "claims",
    name: "Claims Analysis Agent",
    role: "Loss ratio, claim frequency, weather/regional claims trends.",
    skills: ["retrieve_information", "highlight_trends", "identify_investigation_areas"],
    tools: ["get_claims_performance", "get_regional_weather_claims", "calculate_trend", "calculate_summary_stats"],
  },
  {
    key: "conversion",
    name: "Conversion Analysis Agent",
    role: "Quote-to-bind conversion, PCW rank, competitor premium benchmarking.",
    skills: ["retrieve_information", "highlight_trends"],
    tools: ["get_conversion_performance", "get_competitor_information", "calculate_percentage_change"],
  },
  {
    key: "recommend",
    name: "Recommendation Agent",
    role: "Always runs last. Reads whichever specialists' condensed findings the orchestrator routed to, plus its own tools, to produce the final recommendation and reasoning - or a capability overview for meta-questions like \"what can you do\".",
    skills: ["recommend_pricing_actions", "explain_reasoning", "describe_capabilities"],
    tools: [
      "get_previous_pricing_actions",
      "search_unstructured_sources",
      "get_customer_feedback_metrics",
      "list_demo_scenarios",
    ],
  },
];

const SKILLS_CATALOG: { name: string; description: string; legacy?: boolean }[] = [
  {
    name: "orchestrate_flow",
    description: "Orchestration Agent's routing logic - classify a question into a subset of {market, claims, conversion}, or none.",
  },
  {
    name: "retrieve_information",
    description: "How to pick the right MCP tool for a question shape, and filter narrowly rather than over-fetching.",
  },
  {
    name: "summarise_findings",
    description: "Condense retrieved records into the handful of facts that actually matter.",
  },
  {
    name: "highlight_trends",
    description: "Route any numeric trend through calculate_trend/calculate_percentage_change rather than eyeballing it.",
  },
  {
    name: "identify_investigation_areas",
    description: "Flag what the data can't explain, or where sources disagree.",
  },
  {
    name: "recommend_pricing_actions",
    description: "Turn findings into one specific action (or an explicit no-action), grounded in precedent and competitive position.",
  },
  {
    name: "explain_reasoning",
    description: "State why - cite the specific numbers/sources, and explain why the obvious alternative was rejected.",
  },
  {
    name: "describe_capabilities",
    description: "Answer meta-questions about the copilot itself (\"what can you do\", \"give me example scenarios\") using list_demo_scenarios - never invented examples.",
  },
  {
    name: "master_orchestrator",
    description: "Original single-agent instructions (full workflow, all 13 tools). Kept for reference - not used by the live 5-agent graph.",
    legacy: true,
  },
];

const TOOL_CATALOG: { category: string; label: string; tools: { name: string; description: string }[] }[] = [
  {
    category: "json",
    label: "Direct JSON query",
    tools: [
      { name: "get_competitor_information", description: "Quarterly premium benchmarking vs 6 competitors" },
      { name: "get_previous_pricing_actions", description: "Historical pricing actions + logged impact" },
      { name: "get_customer_feedback_metrics", description: "Monthly NPS/CSAT/complaint volumes" },
      { name: "list_market_intelligence", description: "Structured index of market intel items" },
      { name: "list_demo_scenarios", description: "Example analyst questions, for \"what can you do\" meta-questions" },
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
        {call.agent && (
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {call.agent}
          </span>
        )}
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

function RoutingBanner({ routing }: { routing?: string[] }) {
  if (routing === undefined) return null;

  if (routing.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        No specialists needed — answered directly by the Recommendation Agent.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-slate-500 dark:text-slate-400">Routed to:</span>
      {routing.map((name) => {
        const style = AGENT_STYLE[name] ?? DEFAULT_AGENT_STYLE;
        return (
          <span
            key={name}
            className={`flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-medium dark:bg-slate-900 ${style.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {AGENT_LABELS[name] ?? name}
          </span>
        );
      })}
    </div>
  );
}

function groupByAgent(trace: TraceCall[]): { agent?: string; calls: TraceCall[] }[] {
  const groups: { agent?: string; calls: TraceCall[] }[] = [];
  const indexByAgent = new Map<string | undefined, number>();
  for (const call of trace) {
    if (!indexByAgent.has(call.agent)) {
      indexByAgent.set(call.agent, groups.length);
      groups.push({ agent: call.agent, calls: [] });
    }
    groups[indexByAgent.get(call.agent)!].calls.push(call);
  }
  return groups;
}

function TraceTab({ trace, routing }: { trace: TraceCall[]; routing?: string[] }) {
  if (trace.length === 0 && routing === undefined) {
    return <p className="px-1 text-sm text-slate-400">Ask a question to see the retrieval trace here.</p>;
  }

  const groups = groupByAgent(trace);

  return (
    <div className="flex flex-col gap-3">
      <RoutingBanner routing={routing} />
      {groups.map((group, i) => {
        const style = group.agent ? (AGENT_STYLE[group.agent] ?? DEFAULT_AGENT_STYLE) : DEFAULT_AGENT_STYLE;
        return (
          <div key={group.agent ?? `ungrouped-${i}`} className="flex flex-col gap-2">
            {group.agent && (
              <div className="flex items-center gap-1.5 px-0.5">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                  {AGENT_LABELS[group.agent] ?? group.agent}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {group.calls.length} call{group.calls.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {group.calls.map((call) => (
                <TraceCard key={call.id} call={call} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentsTab() {
  return (
    <div className="flex flex-col gap-3">
      {AGENT_CATALOG.map((agent) => {
        const style = AGENT_STYLE[agent.key] ?? DEFAULT_AGENT_STYLE;
        return (
          <div key={agent.key} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
            <div className="mb-1 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">{agent.name}</h4>
            </div>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{agent.role}</p>
            {agent.skills.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {agent.skills.map((skill) => (
                  <code
                    key={skill}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {skill}
                  </code>
                ))}
              </div>
            )}
            {agent.tools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.tools.map((tool) => (
                  <code
                    key={tool}
                    className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                  >
                    {tool}
                  </code>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkillsTab() {
  return (
    <div className="flex flex-col gap-2">
      {SKILLS_CATALOG.map((skill) => (
        <div
          key={skill.name}
          className={`rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 ${skill.legacy ? "opacity-60" : ""}`}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <code className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{skill.name}</code>
            {skill.legacy && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                legacy
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{skill.description}</p>
        </div>
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

const TAB_LABEL: Record<"trace" | "agents" | "skills" | "catalog", string> = {
  trace: "Trace",
  agents: "Agents",
  skills: "Skills",
  catalog: "Tools",
};

export function ActivityPanel({
  trace,
  routing,
  width,
}: {
  trace: TraceCall[];
  routing?: string[];
  width: number;
}) {
  const [tab, setTab] = useState<"trace" | "agents" | "skills" | "catalog">("trace");

  return (
    <aside
      style={{ width }}
      className="flex shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {(["trace", "agents", "skills", "catalog"] as const).map((t) => (
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
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "trace" ? (
          <TraceTab trace={trace} routing={routing} />
        ) : tab === "agents" ? (
          <AgentsTab />
        ) : tab === "skills" ? (
          <SkillsTab />
        ) : (
          <CatalogTab />
        )}
      </div>
    </aside>
  );
}
