# backend

FastAPI service running a 5-agent LangGraph `StateGraph`: an Orchestration Agent routes each question to
whichever of 3 domain specialists are relevant (in parallel), and a Recommendation Agent always runs last.
Connects to `mcp_server` as an MCP client over HTTP — it never imports the tool implementations directly —
and streams its progress to the frontend over Server-Sent Events.

## Folder structure

```
schema.py         PricingAnalysis - the structured final-answer shape (summary/trends/
                   investigation_areas/recommendation/reasoning), one field per skill
llm.py             ChatOllama config, model swappable via OLLAMA_CHAT_MODEL
mcp_client.py       Connects to mcp_server's streamable-http URL, exposes its tools as LangChain tools
skill_loader.py     Reads skills/*.md (repo root) and assembles a system prompt from a given subset
graph.py            The 5-agent LangGraph StateGraph: GraphState schema, the orchestrator's routing
                     node, one node per specialist (each its own cached create_react_agent scoped to
                     its own skill/tool subset), the Send-based parallel fan-out/fan-in, and the
                     Recommendation Agent node. Owns TOOL_CATEGORIES, the PricingAnalysis output
                     parser, and the per-tool live-streaming mechanism (get_stream_writer).
agent.py            Thin shell: builds/caches the compiled graph, drives it with
                     graph.astream(inputs, stream_mode=["updates", "custom"]), retries a whole
                     turn on a transient Ollama-cloud error, and forwards each event on to app.py
dashboard.py         Direct (non-agent) data reads for the dashboard view - calls the same
                      MCP tools, bypassing the LLM entirely, for a fast deterministic view
                      of the raw underlying data
app.py              FastAPI app: POST /chat (SSE), GET /health, GET /dashboard
run_cli.py           Dev/test script - runs the graph directly, no HTTP, printing which agent
                      produced each tool call and the orchestrator's routing decision
```

## The graph, in more detail

`graph.py`'s `GraphState`:

```python
class GraphState(TypedDict):
    query: str
    routing: list[str]                 # subset of ["market", "claims", "conversion"]
    market_findings: str | None
    claims_findings: str | None
    conversion_findings: str | None
    final_answer: dict[str, Any] | None
```

**Orchestrator** (`orchestrate_node`) has no tools — it asks the LLM (with
`skills/orchestrate_flow.md` as its system prompt) to classify the question into a subset of
`{market, claims, conversion}`, using a plain `ainvoke` + `PydanticOutputParser` + format-instructions
prompt rather than `with_structured_output` (see "Known model quirks" below for why). It writes `routing`
and emits a `routing` SSE event.

**Fan-out** (`route_to_specialists`, a conditional edge using LangGraph's `Send` API): dispatches one
`Send(f"{name}_agent", {"query": ...})` per routed domain, run in parallel — or, if `routing` came back
empty (a pure customer-feedback/prior-pricing-action question), a single `Send("recommend", ...)` straight
to the Recommendation Agent, skipping unnecessary specialist runs entirely.

**Specialists** (`market_agent_node` / `claims_agent_node` / `conversion_agent_node`) all share one helper,
`_run_specialist`: it builds (once, cached in `_specialist_agents`) a `create_react_agent` scoped to that
specialist's own skill subset and MCP tool subset (`SPECIALISTS` dict), runs it with
`stream_mode="updates"`, and for every tool call/result observed calls `get_stream_writer()` to push a
`{"type": "tool_call"|"tool_result", "agent": <name>, ...}` dict directly into the *outer* graph's custom
stream — this is what lets the frontend see every individual tool call live, tagged by agent, even though
none of that detail is written into `GraphState`. Only the specialist's final message content (one
condensed findings string) is returned as `{"<name>_findings": text}`.

**Recommendation Agent** (`recommend_node`) reads whichever of `market_findings` / `claims_findings` /
`conversion_findings` are non-`None`, formats them as labeled context blocks, and reuses `_run_specialist`
with its own skill subset (`recommend_pricing_actions`, `explain_reasoning`) and tool subset
(`get_previous_pricing_actions`, `search_unstructured_sources`, `get_customer_feedback_metrics`). Its output
is parsed into `PricingAnalysis` via `_parse_final_answer` and written to `final_answer`.

## Known model quirks (both against `gpt-oss:120b-cloud` via Ollama)

- **Final-answer structured output**: `create_react_agent`'s built-in `response_format` failed two
  different ways (`json_schema` returned nothing, `function_calling` never called the tool). Worked around
  by asking for JSON in the final free-text turn and parsing it client-side (`_parse_final_answer`),
  falling back to putting the raw text in `recommendation` rather than crashing.
- **Routing decision structured output**: the exact same failure mode, discovered independently while
  building the orchestrator — `with_structured_output(RoutingDecision)` either returned prose
  (`json_schema` method) or skipped the tool call and returned an empty `content='[]']` (`function_calling`
  method). Fixed the identical way: plain `ainvoke` + format-instructions prompt + `PydanticOutputParser`,
  with a fallback to routing all 3 domains only on a genuine parse failure (not for a legitimately empty
  decision, which parses fine as `{"agents": []}`).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | FastAPI |
| Agent orchestration | LangGraph `StateGraph`, with each agent node a `create_react_agent` |
| Parallel fan-out/fan-in | LangGraph `Send` API |
| Live per-agent streaming | `langgraph.config.get_stream_writer()`, custom stream mode |
| MCP client | langchain-mcp-adapters (`MultiServerMCPClient`, streamable_http transport) |
| LLM | langchain-ollama `ChatOllama` |
| Streaming to frontend | Server-Sent Events (`sse-starlette`) |

## API

### `GET /health`
`{"status": "ok"}`

### `POST /chat`
Request: `{"question": string}`. Response: `text/event-stream`, one event per SSE frame:

| `type` | Shape | Emitted by |
|---|---|---|
| `routing` | `{ agents: string[] }` | Orchestrator, once per turn |
| `tool_call` | `{ id, tool, category, args, agent }` | Whichever specialist/Recommendation Agent made the call |
| `tool_result` | `{ id, tool, category, result, agent }` | Same |
| `final_answer` | `{ summary[], trends[], investigation_areas[], recommendation, reasoning }` | Recommendation Agent |
| `retry` | `{ attempt, message }` — everything since the last `retry` (or stream start) should be discarded | `agent.py`'s retry loop |
| `error` | `{ message }` | `agent.py`'s retry loop |

See `frontend/README.md` for the full `AgentEvent` TypeScript union, or `graph.py`/`agent.py` for the
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

# or, without HTTP, for a quick check that also prints the routing decision
# and which agent made each tool call:
uv run backend/run_cli.py "why is young driver loss ratio worsening?"
```

Requires `mcp_server` already running (`MCP_SERVER_URL`, default `http://127.0.0.1:8001/mcp`) and Ollama
reachable (`OLLAMA_BASE_URL`, default `http://localhost:11434`).
