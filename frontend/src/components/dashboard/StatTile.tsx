type StatTileProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function StatTile({ label, value, sublabel }: StatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      {sublabel && <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sublabel}</div>}
    </div>
  );
}
