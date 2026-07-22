export type ToolCategory = "json" | "file" | "sql" | "vector" | "math" | "other";

export type AgentEvent =
  | { type: "tool_call"; id: string; tool: string; category: ToolCategory; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; tool: string; category: ToolCategory; result: unknown }
  | {
      type: "final_answer";
      summary: string[];
      trends: string[];
      investigation_areas: string[];
      recommendation: string;
      reasoning: string;
    }
  | { type: "retry"; attempt: number; message: string }
  | { type: "error"; message: string };

export const API_BASE = import.meta.env.VITE_AGENT_API_URL ?? "http://localhost:8000";

// EventSource doesn't support POST bodies, so this parses the
// text/event-stream response from a fetch() call by hand: events are
// separated by a blank line, each line prefixed "event: " or "data: ". The
// backend sends a plain "\n" separator (see backend/app.py's
// EventSourceResponse(..., sep="\n")); \r?\n is tolerated here too in case
// that ever changes, since sse-starlette's default is "\r\n".
export async function* streamChat(
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Agent API request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const rawEvents = buffer.split(/\r?\n\r?\n/);
    buffer = rawEvents.pop() ?? "";

    for (const rawEvent of rawEvents) {
      const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data: "));
      if (dataLine) {
        yield JSON.parse(dataLine.slice("data: ".length)) as AgentEvent;
      }
    }
  }
}
