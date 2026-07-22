export type SidebarTurn = {
  id: string;
  question: string;
};

type SidebarProps = {
  turns: SidebarTurn[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewQuestion: () => void;
  width: number;
};

export function Sidebar({ turns, activeId, onSelect, onNewQuestion, width }: SidebarProps) {
  return (
    <aside
      style={{ width }}
      className="flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
          PA
        </div>
        <div>
          <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pricing Copilot
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Aviva UK Motor</div>
        </div>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNewQuestion}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          New conversation
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3">
        {turns.length > 0 && (
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            This session
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {turns.map((turn) => (
            <button
              key={turn.id}
              type="button"
              onClick={() => onSelect(turn.id)}
              className={`truncate rounded-lg px-3 py-2 text-left text-sm ${
                turn.id === activeId
                  ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              title={turn.question}
            >
              {turn.question}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-800">
        History is local to this browser session, not saved.
      </div>
    </aside>
  );
}
