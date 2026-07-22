import { useEffect, useRef, useState } from "react";
import { streamChat, type AgentEvent, type ToolCategory } from "./api";
import "./App.css";

type TraceCall = {
  id: string;
  tool: string;
  category: ToolCategory;
  args: Record<string, unknown>;
  result?: unknown;
};

type Answer = {
  summary: string[];
  trends: string[];
  investigationAreas: string[];
  recommendation: string;
  reasoning: string;
};

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  json: "JSON",
  file: "File",
  sql: "SQL",
  vector: "Vector",
  math: "Math",
  other: "Other",
};

const EXAMPLE_QUESTIONS = [
  "Why is the loss ratio for our young driver segment getting worse, and what should we do about it?",
  "What are customers saying about renewal price increases?",
  "How does our young driver pricing compare to competitors?",
];

function App() {
  const [question, setQuestion] = useState("");
  const [trace, setTrace] = useState<TraceCall[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request if the component unmounts mid-stream.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(q: string) {
    if (!q.trim() || isRunning) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setTrace([]);
    setAnswer(null);
    setError("");

    try {
      for await (const event of streamChat(q, controller.signal) as AsyncGenerator<AgentEvent>) {
        if (event.type === "tool_call") {
          setTrace((t) => [
            ...t,
            { id: event.id, tool: event.tool, category: event.category, args: event.args },
          ]);
        } else if (event.type === "tool_result") {
          setTrace((t) => t.map((c) => (c.id === event.id ? { ...c, result: event.result } : c)));
        } else if (event.type === "retry") {
          // Everything since the start of this stream belongs to a failed
          // attempt the agent is discarding - drop it rather than showing a
          // duplicated/inconsistent trace once the retry's own events land.
          setTrace([]);
        } else if (event.type === "final_answer") {
          setAnswer({
            summary: event.summary,
            trends: event.trends,
            investigationAreas: event.investigation_areas,
            recommendation: event.recommendation,
            reasoning: event.reasoning,
          });
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Pricing Analyst Copilot</h1>
        <p className="subtitle">Aviva UK Private Car Motor Insurance — demo</p>
      </header>

      <form
        className="question-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a pricing question..."
          aria-label="Pricing question"
          disabled={isRunning}
        />
        <button type="submit" disabled={isRunning}>
          {isRunning ? "Working..." : "Ask"}
        </button>
      </form>

      <div className="examples">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            className="example-chip"
            disabled={isRunning}
            onClick={() => {
              setQuestion(q);
              ask(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {trace.length > 0 && (
        <section className="trace">
          <h2>Retrieval trace</h2>
          <div className="trace-cards">
            {trace.map((call) => (
              <div key={call.id} className={`trace-card cat-${call.category}`}>
                <div className="trace-card-header">
                  <span className="category-badge">{CATEGORY_LABEL[call.category]}</span>
                  <code>{call.tool}</code>
                  {call.result === undefined && <span className="pending">running…</span>}
                </div>
                <div className="trace-card-body">
                  <div className="trace-args">{JSON.stringify(call.args)}</div>
                  {call.result !== undefined && (
                    <div className="trace-result">{JSON.stringify(call.result).slice(0, 220)}…</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      {answer && (
        <section className="answer">
          <h2>Answer</h2>
          <div className="answer-cards">
            <div className="answer-card">
              <h3>Summary</h3>
              <ul>
                {answer.summary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="answer-card">
              <h3>Trends</h3>
              <ul>
                {answer.trends.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            {answer.investigationAreas.length > 0 && (
              <div className="answer-card">
                <h3>Investigation areas</h3>
                <ul>
                  {answer.investigationAreas.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="answer-card recommendation">
              <h3>Recommendation</h3>
              <p>{answer.recommendation}</p>
            </div>

            <div className="answer-card">
              <h3>Reasoning</h3>
              <p>{answer.reasoning}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
