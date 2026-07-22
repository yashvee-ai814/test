# Pricing Analyst Copilot — Project Constitution

This file is the project/dev-facing reference for this repo — conventions, structure, and commands for
anyone (human or Claude Code) working on the code. It is a different layer from `skills/*.md`, which is
the **agent's own runtime instruction set**, loaded by `backend/skill_loader.py` into the LLM's system
prompt at request time. Read `skills/` to understand how the agent behaves; read this file to understand
how the repo is put together.

## What this is

Challenge B ([challenge.md](challenge.md)): an AI agent that acts as a Pricing Analyst Copilot for Aviva UK
Private Car Motor Insurance, bringing together claims, conversion, competitor, market-intelligence,
customer-feedback, and prior-pricing-action data to generate and explain pricing recommendations. Full
design rationale is in [IMPLEMENTATION.md](IMPLEMENTATION.md); forward-looking work (multi-agent split,
continuous evaluation) is in [plan_phase_2.md](plan_phase_2.md).

## Tech stack

| Concern | Choice |
|---|---|
| MCP server | Python, [FastMCP](https://gofastmcp.com), `streamable-http` transport |
| Backend | Python, FastAPI, [LangGraph](https://langchain-ai.github.io/langgraph/) (`create_react_agent`), [langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters) |
| LLM | [Ollama](https://ollama.com), default `gpt-oss:120b-cloud` (chat), `nomic-embed-text` (embeddings) — swappable via env vars |
| Structured data | SQLite (typed queries only, no raw SQL) |
| Unstructured data | [Chroma](https://www.trychroma.com) vector store |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Python package management | [uv](https://docs.astral.sh/uv/), one shared `pyproject.toml` for `mcp_server/` + `backend/` |
| Frontend package management | npm |

## Canonical folder structure

```
data/                          Pristine synthetic source data (JSON + markdown) — never write derived state here
store/                         Generated, gitignored: SQLite db + Chroma index
mcp_server/                    MICROSERVICE 1 — FastMCP, streamable-http, port 8001
  paths.py                       Shared path constants
  build_db.py                    JSON → SQLite loader + verification
  build_vector_index.py          Embeds unstructured sources into Chroma
  json_tools.py                  Direct-JSON query tools
  file_tools.py                  Direct file-read tool
  sql_tools.py                   Typed SQLite query tools (no raw SQL)
  vector_tools.py                Vector semantic search tool
  math_tools.py                  Deterministic calculation tools
  server.py                      Registers all 12 tools, runs the MCP server
skills/                        Agent runtime instructions — read by backend/skill_loader.py, not by humans running the app
  master_orchestrator.md         Tool inventory, workflow, hard constraints
  retrieve_information.md, summarise_findings.md, highlight_trends.md,
  identify_investigation_areas.md, recommend_pricing_actions.md, explain_reasoning.md
backend/                       MICROSERVICE 2 — FastAPI, port 8000
  schema.py                      PricingAnalysis (structured final-answer shape)
  llm.py                         ChatOllama config
  mcp_client.py                  MCP client pointed at mcp_server's HTTP URL
  skill_loader.py                Assembles the system prompt from skills/*.md
  agent.py                       The LangGraph agent + SSE event generator
  app.py                         FastAPI app: POST /chat (SSE), GET /health
  run_cli.py                     Dev/test script: runs the agent without HTTP
frontend/                      MICROSERVICE 3 — React + Vite, port 5173
  src/
    api.ts                        SSE client + AgentEvent/ToolCategory types (the data contract with backend/)
    types.ts                      Shared frontend types (Turn, TraceCall, Answer)
    context/ThemeContext.tsx       Light/dark toggle
    components/layout/             Header, Sidebar
    components/chat/               WelcomeScreen, ChatWindow, ChatInput, MessageBubble, PricingAnalysisCard, ToolCallBadge
    components/trace/              ActivityPanel (live trace + static tool catalog)
    App.tsx                        Layout shell wiring the above together
pyproject.toml                 uv-managed deps, shared by mcp_server/ + backend/
plan_phase_2.md                Forward-looking: 4-agent split, continuous evaluation/model drift
IMPLEMENTATION.md              HLD, retrieval-technique-per-source table, tool catalog, design rationale
```

## Code conventions

- **MCP tools are typed and parametrized, never raw SQL or unsanitized file/glob input.** `sql_tools.py`
  has no `run_sql_query`-style escape hatch by design; `file_tools.py` validates its `id` parameter against
  a strict pattern before it ever reaches a filesystem call.
- **The LLM never does arithmetic.** Any percentage change, trend, or summary statistic the agent states
  must come from `math_tools.py`, not be estimated from reading a series of numbers.
- **Tool docstrings state exact valid enum values** (segment names, channel names, etc.), not just types —
  the agent will otherwise guess plausible-but-wrong values and silently get empty results.
- **Every MCP tool returns compact, pre-filtered JSON, never a whole source file.** This — not prompt
  instructions — is the actual mechanism that keeps the LLM's context minimal.
- **Skills, not hardcoded prompts.** `backend/skill_loader.py` builds the system prompt from `skills/*.md`
  at request time. Adding/changing agent behavior means editing a skill file, not `agent.py`.
- **React components are `.tsx`, styled with Tailwind utility classes** — no separate `.css` files per
  component, no CSS-in-JS, no component library. Icons are hand-drawn inline SVGs, matching the rest of the
  codebase's "minimum dependencies" bias.
- **No raw model-only "content" strings for the final answer.** The agent's last turn is parsed into the
  `PricingAnalysis` schema (`backend/schema.py`) so the frontend renders distinct summary/trends/
  investigation-areas/recommendation/reasoning sections — see `IMPLEMENTATION.md` §6 for why this goes
  through JSON-in-final-turn-parsed-client-side rather than LangGraph's built-in `response_format`.
- **Comments only when the WHY is non-obvious** (a workaround for a specific model quirk, a security
  invariant, a subtle ordering requirement) — not restating what the code already says.

## Data ground rules (established generating `data/` — don't relearn these)

- **Never let new content (prompts, skills, UI copy) assert a number that isn't actually in the data.**
  Verify with a script before trusting a claim, not by eyeballing.
- Segment name strings (`"Young Driver (17-25)"`, `"Standard (26-45)"`, `"Experienced (46-65)"`,
  `"Senior (66+)"`) must stay byte-identical across `claims_performance.json` and `conversion_performance.json`.
- `claims_performance.json`'s per-record `region` field is a rotating label, **not** a real per-region
  breakdown — `regional_weather_claims` is the genuine regional axis. Both `sql_tools.py`'s docstring and
  `master_orchestrator.md` call this out explicitly so the agent doesn't misuse it.
- `conversion_performance.json`'s `average_pcw_rank` is genuinely absent (not `null`) on non-PCW-channel
  rows — handled in the SQLite loader via `.get()`, not by editing the source JSON.
- If regenerating any source JSON, re-verify row counts, segment-name matches, and id cross-references
  afterward (see `mcp_server/build_db.py`'s own verification step for the pattern to follow).

## Local dev commands

```bash
# One-time data build
uv run mcp_server/build_db.py
uv run mcp_server/build_vector_index.py

# Run all 3 services (separate terminals)
uv run mcp_server/server.py
uv run uvicorn app:app --app-dir backend --port 8000
cd frontend && npm run dev

# Quick agent test without the frontend/HTTP layer
uv run backend/run_cli.py "why is young driver loss ratio worsening?"
```

## Git workflow

- `main` — the working trunk.
- `data-baseline` — a fixed pointer to the commit right after the synthetic data + initial scaffolding, so
  the pristine data is always recoverable independent of where `main` goes.
- Feature work happens on `feature/*` branches off `main`.
- Only create commits when explicitly asked — this repo's history should reflect deliberate checkpoints,
  not every intermediate edit.

## Current state / not yet built

Phase 1 (this repo, as it stands) is fully built and verified end to end: all 3 services run, the agent
retrieves across all 6 data sources via the appropriate technique, computes trends deterministically, and
returns a structured, cited recommendation. Not yet built (see `plan_phase_2.md`): the bonus 4-specialist-
agent LangGraph split, and continuous evaluation / model-drift monitoring.
