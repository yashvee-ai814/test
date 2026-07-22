const EXAMPLE_QUESTIONS = [
  {
    title: "Young driver loss ratio",
    prompt: "Why is the loss ratio for our young driver segment getting worse, and what should we do about it?",
    color: "brand" as const,
  },
  {
    title: "Customer sentiment",
    prompt: "What are customers saying about renewal price increases?",
    color: "indigo" as const,
  },
  {
    title: "Competitor positioning",
    prompt: "How does our young driver pricing compare to competitors?",
    color: "emerald" as const,
  },
];

const COLOR_MAP = {
  brand: "bg-brand-50 border-brand-200 text-brand-700 dark:bg-slate-800 dark:border-slate-700 dark:text-brand-400",
  indigo:
    "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400",
  emerald:
    "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-400",
};

export function WelcomeScreen({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-lg">
        PA
      </div>
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
        What would you like to <span className="text-gradient">investigate</span>?
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Ask about claims, conversion, competitor pricing, market intelligence, or customer feedback — the
        copilot retrieves from the relevant sources and explains its reasoning.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {EXAMPLE_QUESTIONS.map((example) => (
          <button
            key={example.title}
            type="button"
            onClick={() => onAsk(example.prompt)}
            className={`rounded-xl border p-4 text-left text-sm transition hover:shadow-md ${COLOR_MAP[example.color]}`}
          >
            <div className="font-semibold">{example.title}</div>
            <div className="mt-1 text-xs opacity-80">{example.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
