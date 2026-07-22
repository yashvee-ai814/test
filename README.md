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

```mermaid
flowchart LR
    subgraph Frontend["frontend (React + Vite, :5173)"]
        UI[Chat UI]
    end
    subgraph Backend["backend (FastAPI + LangGraph, :8000)"]
        Agent[ReAct agent]
    end
    subgraph MCP["mcp_server (FastMCP, :8001)"]
        Tools[12 tools]
    end
    subgraph Data["data/ + store/"]
        JSON[(JSON files)]
        SQL[(SQLite)]
        Vec[(Chroma)]
    end
    Ollama[("Ollama\ngpt-oss:120b-cloud +\nnomic-embed-text")]

    UI -- "POST /chat (SSE)" --> Agent
    Agent -- MCP over HTTP --> Tools
    Agent -- chat completions --> Ollama
    Tools --> JSON
    Tools --> SQL
    Tools --> Vec
    Vec -. embeddings .-> Ollama
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
