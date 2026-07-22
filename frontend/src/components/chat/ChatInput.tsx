import { forwardRef, useState } from "react";

type ChatInputProps = {
  disabled: boolean;
  onSubmit: (question: string) => void;
};

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { disabled, onSubmit },
  ref,
) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || disabled) return;
    onSubmit(value);
    setValue("");
  }

  return (
    <form
      className="flex gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask a pricing question..."
        aria-label="Pricing question"
        disabled={disabled}
        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
      >
        {disabled ? "Working…" : "Ask"}
      </button>
    </form>
  );
});
