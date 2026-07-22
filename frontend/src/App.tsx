import { useRef, useState } from "react";
import { streamChat, type AgentEvent } from "./api";
import type { Turn } from "./types";
import { ThemeProvider } from "./context/ThemeContext";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { WelcomeScreen } from "./components/chat/WelcomeScreen";
import { ChatWindow } from "./components/chat/ChatWindow";
import { ChatInput } from "./components/chat/ChatInput";
import { ActivityPanel } from "./components/trace/ActivityPanel";

function newTurn(question: string): Turn {
  return {
    id: crypto.randomUUID(),
    question,
    trace: [],
    answer: null,
    error: null,
    isRunning: true,
  };
}

function AppShell() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isRunning = turns.some((t) => t.isRunning);
  const activeTurn = turns.find((t) => t.id === activeId) ?? turns[turns.length - 1];

  function updateTurn(id: string, patch: Partial<Turn>) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function ask(question: string) {
    if (!question.trim() || isRunning) return;
    const turn = newTurn(question);
    setTurns((prev) => [...prev, turn]);
    setActiveId(turn.id);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamChat(question, controller.signal) as AsyncGenerator<AgentEvent>) {
        if (event.type === "tool_call") {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === turn.id
                ? { ...t, trace: [...t.trace, { id: event.id, tool: event.tool, category: event.category, args: event.args }] }
                : t,
            ),
          );
        } else if (event.type === "tool_result") {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === turn.id
                ? { ...t, trace: t.trace.map((c) => (c.id === event.id ? { ...c, result: event.result } : c)) }
                : t,
            ),
          );
        } else if (event.type === "retry") {
          updateTurn(turn.id, { trace: [] });
        } else if (event.type === "final_answer") {
          updateTurn(turn.id, {
            answer: {
              summary: event.summary,
              trends: event.trends,
              investigationAreas: event.investigation_areas,
              recommendation: event.recommendation,
              reasoning: event.reasoning,
            },
            isRunning: false,
          });
        } else if (event.type === "error") {
          updateTurn(turn.id, { error: event.message, isRunning: false });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        updateTurn(turn.id, {
          error: err instanceof Error ? err.message : String(err),
          isRunning: false,
        });
      }
    } finally {
      updateTurn(turn.id, { isRunning: false });
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-[linear-gradient(160deg,_#0a0f1a_0%,_#1a0f14_45%,_#0a0f1a_100%)]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          turns={turns.map((t) => ({ id: t.id, question: t.question }))}
          activeId={activeId}
          onSelect={setActiveId}
          onNewQuestion={() => inputRef.current?.focus()}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {turns.length === 0 ? (
            <WelcomeScreen onAsk={ask} />
          ) : (
            <ChatWindow turns={turns} />
          )}
          <ChatInput ref={inputRef} disabled={isRunning} onSubmit={ask} />
        </div>

        <ActivityPanel trace={activeTurn?.trace ?? []} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
