export function MessageBubble({ question }: { question: string }) {
  return (
    <div className="flex items-start justify-end gap-2">
      <div className="max-w-xl rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-700 px-4 py-2.5 text-sm text-white shadow-sm">
        {question}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        You
      </div>
    </div>
  );
}
