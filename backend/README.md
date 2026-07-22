# backend

FastAPI service running the LangGraph orchestrator agent. Connects to `mcp_server` as an MCP client over
HTTP — it never imports the tool implementations directly — and streams its progress to the frontend over
Server-Sent Events.

## Folder structure

```
schema.py         PricingAnalysis - the structured final-answer shape (summary/trends/
                   investigation_areas/recommendation/reasoning), one field per skill
llm.py             ChatOllama config, model swappable via OLLAMA_CHAT_MODEL
mcp_client.py       Connects to mcp_server's streamable-http URL, exposes its tools as LangChain tools
skill_loader.py     Reads skills/*.md (repo root) and assembles the system prompt
agent.py            Builds the LangGraph agent (cached per process) and streams step events;
                     tags each tool call with a retrieval-technique category; retries a whole
                     turn on a transient Ollama-cloud error; parses the final turn's JSON into
                     PricingAnalysis
dashboard.py         Direct (non-agent) data reads for the dashboard view - calls the same
                      MCP tools, bypassing the LLM entirely, for a fast deterministic view
                      of the raw underlying data
app.py              FastAPI app: POST /chat (SSE), GET /health, GET /dashboard
run_cli.py           Dev/test script - runs the agent directly, no HTTP, for quick verification
```

## Tech stack

| Concern | Choice |
|---|---|
| Framework | FastAPI |
| Agent | LangGraph `create_react_agent` |
| MCP client | langchain-mcp-adapters (`MultiServerMCPClient`, streamable_http transport) |
| LLM | langchain-ollama `ChatOllama` |
| Streaming | Server-Sent Events (`sse-starlette`) |

## API

### `GET /health`
`{"status": "ok"}`

### `POST /chat`
Request: `{"question": string}`. Response: `text/event-stream`, one `AgentEvent` per SSE frame — see
`frontend/README.md` for the full event-type table, or `agent.py`'s `stream_query` docstring for the
authoritative shape.

### `GET /dashboard`
No request body. Returns a single JSON payload (KPI stats, claims/conversion trends, a competitor
premium snapshot, feedback trend, market-intelligence sentiment breakdown, and the pricing-actions list)
straight from the MCP tools — no LLM call, so it's fast and always the same shape. Powers the frontend's
Dashboard view (`frontend/src/components/dashboard/`).

## Run

```bash
# from repo root
uv run uvicorn app:app --app-dir backend --port 8000

# or, without HTTP, for a quick check:
uv run backend/run_cli.py "why is young driver loss ratio worsening?"
```

Requires `mcp_server` already running (`MCP_SERVER_URL`, default `http://127.0.0.1:8001/mcp`) and Ollama
reachable (`OLLAMA_BASE_URL`, default `http://localhost:11434`).
