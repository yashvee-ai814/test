import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE } from "../../api";

function useBackendHealth() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/health`)
      .then((res) => {
        if (!cancelled) setOnline(res.ok);
      })
      .catch(() => {
        if (!cancelled) setOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return online;
}

type HeaderProps = {
  view: "chat" | "dashboard";
  onViewChange: (view: "chat" | "dashboard") => void;
};

export function Header({ view, onViewChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const online = useBackendHealth();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Pricing Analyst <span className="text-gradient">Copilot</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-full border border-slate-200 p-0.5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onViewChange("chat")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === "chat"
                ? "bg-brand-600 text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Copilot
          </button>
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === "dashboard"
                ? "bg-brand-600 text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Dashboard
          </button>
        </div>

        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            online
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : online === false
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online ? "animate-pulse bg-emerald-500" : online === false ? "bg-rose-500" : "bg-slate-400"
            }`}
          />
          {online === null ? "Checking…" : online ? "Agent online" : "Agent offline"}
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
