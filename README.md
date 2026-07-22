# Pricing Analyst Copilot

An AI agent that acts as a Pricing Analyst Copilot for Aviva UK Private Car Motor Insurance — it retrieves
across claims, conversion, competitor, market-intelligence, customer-feedback, and prior-pricing-action
data, summarises findings, highlights trends, flags what needs investigation, and recommends (or explicitly
declines to recommend) a pricing action with cited reasoning.

Built as three independent services — an MCP data server, a FastAPI/LangGraph backend, and a React
frontend — to double as a demo of MCP tool design: how different data shapes (relational, small structured,
free-text) map to different retrieval techniques (SQLite, direct JSON, vector search), and how an LLM agent
connects to that as a genuine network service rather than an in-process import.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the full design rationale, [CLAUDE.md](CLAUDE.md) for repo
conventions, and [plan_phase_2.md](plan_phase_2.md) for what's deliberately not built yet.

## Architecture

Three independent services, each its own process/port — `backend` never imports `mcp_server`'s tool code,
it only ever talks to it over HTTP as an MCP client, the way it would talk to a real internal data API:

```mermaid
flowchart TB
    subgraph FE["frontend :5173  (React + Vite + Tailwind)"]
        UI["Sidebar · ChatWindow · ActivityPanel"]
    end

    subgraph BE["backend :8000  (FastAPI + LangGraph)"]
        Agent["create_react_agent<br/>(skills/*.md → system prompt)"]
    end

    subgraph MCP["mcp_server :8001  (FastMCP, streamable-http)"]
        direction LR
        subgraph catJSON["direct JSON"]
            j1[get_competitor_information]
            j2[get_previous_pricing_actions]
            j3[get_customer_feedback_metrics]
            j4[list_market_intelligence]
        end
        subgraph catFile["direct file"]
            f1[get_market_intelligence_doc]
        end
        subgraph catSQL["typed SQLite"]
            s1[get_claims_performance]
            s2[get_regional_weather_claims]
            s3[get_conversion_performance]
        end
        subgraph catVec["vector search"]
            v1[search_unstructured_sources]
        end
        subgraph catMath["deterministic math"]
            m1[calculate_percentage_change]
            m2[calculate_trend]
            m3[calculate_summary_stats]
        end
    end

    JSONFiles[("data/*.json")]
    SQLite[("store/pricing_copilot.db")]
    Chroma[("store/chroma/")]
    Ollama[("Ollama<br/>gpt-oss:120b-cloud +<br/>nomic-embed-text")]

    UI <-->|"POST /chat (SSE)"| Agent
    Agent <-->|"MCP over HTTP"| catJSON & catFile & catSQL & catVec & catMath
    Agent <-->|chat completions| Ollama
    catJSON --> JSONFiles
    catFile --> JSONFiles
    catSQL --> SQLite
    catVec --> Chroma
    Chroma -.embeddings.-> Ollama
    m1 ~~~ m2 ~~~ m3
```

## Request flow

```mermaid
sequenceDiagram
    participant U as Analyst (browser)
    participant F as frontend
    participant B as backend
    participant M as mcp_server
    participant O as Ollama

    U->>F: Ask a pricing question
    F->>B: POST /chat
    B->>O: system prompt (skills/*.md) + question
    O-->>B: tool call (e.g. get_claims_performance)
    B->>M: MCP tool call over HTTP
    M-->>B: compact, pre-filtered JSON
    B-->>F: SSE: tool_call / tool_result
    B->>O: tool result appended to context
    O-->>B: more tool calls, then final JSON answer
    B-->>F: SSE: final_answer (structured PricingAnalysis)
    F-->>U: renders trace cards + answer cards
```

## Data retrieval design

Every source file's retrieval technique was picked individually by its actual shape, not assigned by a
blanket rule — two sources even fan out into more than one technique because a single file can contain
both predictably-structured fields and genuine free text:

```mermaid
flowchart LR
    S1[claims_performance.json] --> SQL1[get_claims_performance]
    S1 --> SQL2[get_regional_weather_claims]
    S2[conversion_performance.json] --> SQL3[get_conversion_performance]
    S3[competitor_information.json] --> J1[get_competitor_information]
    S4a["previous_pricing_actions.json<br/>(structured fields)"] --> J2[get_previous_pricing_actions]
    S4b["previous_pricing_actions.json<br/>(rationale text)"] -.semantic.-> V1[search_unstructured_sources]
    S5a["customer_feedback.json<br/>(metrics)"] --> J3[get_customer_feedback_metrics]
    S5b["customer_feedback.json<br/>(comments)"] -.semantic.-> V1
    S6a["market_intelligence.json<br/>(index)"] --> J4[list_market_intelligence]
    S6b["market_intelligence/*.md"] -.semantic.-> V1
    S6b --> F1[get_market_intelligence_doc]
```

See [IMPLEMENTATION.md](IMPLEMENTATION.md) §2 for the full source-by-source rationale.

## Tech stack

| Concern | Choice |
|---|---|
| MCP server | Python, FastMCP, streamable-http transport |
| Backend | Python, FastAPI, LangGraph, langchain-mcp-adapters |
| LLM | Ollama (`gpt-oss:120b-cloud` chat, `nomic-embed-text` embeddings) |
| Structured data | SQLite (typed queries only) |
| Unstructured data | Chroma vector store |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |

## Services & ports

| Service | Port | Run command |
|---|---|---|
| `mcp_server` | 8001 | `uv run mcp_server/server.py` |
| `backend` | 8000 | `uv run uvicorn app:app --app-dir backend --port 8000` |
| `frontend` | 5173 | `cd frontend && npm run dev` |
| Ollama | 11434 | runs on the host, not part of this repo |

## Environment variables

See [.env.example](.env.example) for the full list (chat/embedding models, service URLs).

## Quick start

```bash
# 1. Build the data stores (one-off)
uv run mcp_server/build_db.py
uv run mcp_server/build_vector_index.py

# 2. Start all 3 services (separate terminals)
uv run mcp_server/server.py
uv run uvicorn app:app --app-dir backend --port 8000
cd frontend && npm install && npm run dev

# 3. Open http://localhost:5173
```

Requires [Ollama](https://ollama.com) running locally with `gpt-oss:120b-cloud` (or a local model of your
choice — see `.env.example`) and `nomic-embed-text` pulled.
