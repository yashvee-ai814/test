import type { Answer, Turn } from "../../types";
import { ToolCallBadge } from "./ToolCallBadge";

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisBody({ answer }: { answer: Answer }) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Summary" items={answer.summary} />
      <Section title="Trends" items={answer.trends} />
      <Section title="Investigation areas" items={answer.investigationAreas} />

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          Recommendation
        </h4>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{answer.recommendation}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reasoning</h4>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{answer.reasoning}</p>
      </div>
    </div>
  );
}

export function PricingAnalysisCard({ turn }: { turn: Turn }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
        PA
      </div>
      <div className="max-w-2xl flex-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        {turn.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{turn.error}</p>
        ) : turn.answer ? (
          <>
            <AnalysisBody answer={turn.answer} />
            <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-700">
              <ToolCallBadge trace={turn.trace} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            {turn.trace.length === 0
              ? "Thinking…"
              : `Retrieving… (${turn.trace.length} tool call${turn.trace.length === 1 ? "" : "s"} so far)`}
          </div>
        )}
      </div>
    </div>
  );
}
