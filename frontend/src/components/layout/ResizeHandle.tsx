export function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative w-1 shrink-0 cursor-col-resize select-none bg-transparent"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 group-hover:bg-brand-400 dark:bg-slate-800 dark:group-hover:bg-brand-500" />
    </div>
  );
}
