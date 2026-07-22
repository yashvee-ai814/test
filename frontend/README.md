# frontend

React + Vite + TypeScript + Tailwind CSS v4 chat UI for the Pricing Analyst Copilot. Talks only to
`backend`'s SSE `/chat` endpoint — never calls `mcp_server` directly.

## Folder structure

```
src/
  api.ts                          SSE client (streamChat) + AgentEvent/ToolCategory types -
                                   the data contract shared with backend/app.py
  types.ts                        Frontend-local types (Turn, TraceCall, Answer)
  context/ThemeContext.tsx        Light/dark toggle, applies the "dark" class to <html>
  components/layout/
    Header.tsx                     Sticky top bar: brand, backend health pill, theme toggle
    Sidebar.tsx                    This-session question history (client-side only, no persistence)
  components/chat/
    WelcomeScreen.tsx              Empty-state example questions
    ChatWindow.tsx                 Scrolling list of turns
    ChatInput.tsx                  Question input + submit
    MessageBubble.tsx              User's question bubble
    PricingAnalysisCard.tsx        Assistant's structured answer (summary/trends/investigation/
                                    recommendation/reasoning) rendered as one card
    ToolCallBadge.tsx              Small "N tool calls" summary under an answer
  components/trace/
    ActivityPanel.tsx              Right-hand panel: live trace (Trace tab) + static 12-tool
                                    reference grouped by retrieval technique (Tool catalog tab)
  App.tsx                          Layout shell: Sidebar + chat column + ActivityPanel
```

## Tech stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config in `src/index.css`) |
| Fonts | Inter (body), Playfair Display (brand/headings) |
| Icons | Hand-drawn inline SVG — no icon package |

## Data contract with `backend`

`POST {VITE_AGENT_API_URL}/chat` with `{"question": string}`, response is `text/event-stream`. Each event's
`data` is JSON matching `AgentEvent` in `src/api.ts`:

| `type` | Shape |
|---|---|
| `tool_call` | `{ id, tool, category, args }` |
| `tool_result` | `{ id, tool, category, result }` |
| `final_answer` | `{ summary[], trends[], investigation_areas[], recommendation, reasoning }` |
| `retry` | `{ attempt, message }` — everything since the last `retry` (or stream start) should be discarded |
| `error` | `{ message }` |

## Run

```bash
npm install
npm run dev      # http://localhost:5173, expects backend on :8000
npm run build    # production build to dist/
```

Set `VITE_AGENT_API_URL` (see root `.env.example`) if the backend isn't on `http://localhost:8000`.
