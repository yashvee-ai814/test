# frontend

React + Vite + TypeScript + Tailwind CSS v4 UI for the Pricing Analyst Copilot: a chat view (talks to
`backend`'s SSE `/chat` endpoint) and a Dashboard view (talks to `backend`'s `GET /dashboard`). Never
calls `mcp_server` directly.

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
    ActivityPanel.tsx              Right-hand panel, 4 tabs: Trace (live, grouped into a
                                    section per agent with a routing banner showing which
                                    domains the orchestrator picked), Agents (static
                                    reference of all 5 agents - role, skills, tool subset),
                                    Skills (static reference of all 9 skill files), Tools
                                    (static 13-tool reference grouped by retrieval technique)
  components/dashboard/
    Dashboard.tsx                   Fetches GET /dashboard, lays out the panels below
    LineChart.tsx                   Hand-rolled multi-series SVG line chart (hover crosshair,
                                     legend, gridlines) - no charting library dependency
    BarChart.tsx                    Hand-rolled horizontal bar chart, per-bar color override
    StatTile.tsx                    label/value/sublabel KPI tile
  App.tsx                          Layout shell: Header view toggle (Copilot / Dashboard) switches
                                    between the chat layout (Sidebar + chat column + ActivityPanel)
                                    and the Dashboard view
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
`data` is JSON matching `AgentEvent` in `src/api.ts`. `backend` is a 5-agent LangGraph graph (an
Orchestrator that routes to up to 3 domain specialists in parallel, then a Recommendation Agent that always
runs) — `tool_call`/`tool_result` carry an optional `agent` field naming which one made the call, and a new
`routing` event reports the orchestrator's decision once per turn, before any specialist's tool calls arrive:

| `type` | Shape |
|---|---|
| `routing` | `{ agents: string[] }` — which domains (`"market"`/`"claims"`/`"conversion"`) the orchestrator picked; an empty array means the question went straight to the Recommendation Agent |
| `tool_call` | `{ id, tool, category, args, agent? }` |
| `tool_result` | `{ id, tool, category, result, agent? }` |
| `final_answer` | `{ summary[], trends[], investigation_areas[], recommendation, reasoning }` |
| `retry` | `{ attempt, message }` — everything since the last `retry` (or stream start) should be discarded |
| `error` | `{ message }` |

`agent` values seen today: `"market"`, `"claims"`, `"conversion"`, `"recommend"` (the orchestrator itself
never calls tools, so it never appears here — its decision surfaces only via the `routing` event).
`ActivityPanel.tsx` groups `Trace` tab cards by this field into per-agent sections instead of one flat list,
and `App.tsx` stores the latest `routing` event on the active `Turn` to render the banner above them.

## Run

```bash
npm install
npm run dev      # http://localhost:5173, expects backend on :8000
npm run build    # production build to dist/
```

Set `VITE_AGENT_API_URL` (see root `.env.example`) if the backend isn't on `http://localhost:8000`.
