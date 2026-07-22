import type { TraceCall } from "../../types";

const CATEGORY_LABEL: Record<string, string> = {
  json: "JSON",
  file: "File",
  sql: "SQL",
  vector: "Vector",
  math: "Math",
  other: "Other",
};

export function ToolCallBadge({ trace }: { trace: TraceCall[] }) {
  if (trace.length === 0) return null;

  const counts = new Map<string, number>();
  for (const call of trace) {
    counts.set(call.category, (counts.get(call.category) ?? 0) + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span>{trace.length} tool calls:</span>
      {[...counts.entries()].map(([category, count]) => (
        <span
          key={category}
          className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {count} {CATEGORY_LABEL[category] ?? category}
        </span>
      ))}
    </div>
  );
}
