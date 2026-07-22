# mcp_server

FastMCP server exposing 12 tools across 4 retrieval techniques, chosen per source file's actual shape
rather than uniformly. Runs standalone (`streamable-http` transport, its own port) so the backend connects
to it as a genuine network service, the way it would connect to a real internal data API.

## Folder structure

```
paths.py               Shared path constants (DATA_DIR, DB_PATH, CHROMA_DIR)
build_db.py             One-off: JSON → SQLite loader + verification (row counts, segment-name
                         cross-check) - run before starting the server
build_vector_index.py    One-off: embeds market intel docs + feedback comments + pricing-action
                          rationales into Chroma - run before starting the server
json_tools.py            Direct-JSON query tools (small, predictable filters, no DB needed)
file_tools.py            Direct file-read tool (validated id -> raw markdown)
sql_tools.py             Typed SQLite query tools - no raw-SQL tool exists by design
vector_tools.py          Vector semantic search over the 3 free-text sources
math_tools.py            Deterministic calculation tools (no LLM arithmetic)
server.py                Registers all 12 tools, runs the streamable-http server
```

## Tech stack

| Concern | Choice |
|---|---|
| MCP framework | [FastMCP](https://gofastmcp.com) |
| Transport | `streamable-http` |
| Structured storage | SQLite |
| Vector storage | Chroma (persisted locally) |
| Embeddings | Ollama `nomic-embed-text` |

## Tool catalog

See [IMPLEMENTATION.md](../IMPLEMENTATION.md) §2 and §4 for the full per-source rationale. Summary:

| Technique | Tools |
|---|---|
| Direct JSON | `get_competitor_information`, `get_previous_pricing_actions`, `get_customer_feedback_metrics`, `list_market_intelligence` |
| Direct file read | `get_market_intelligence_doc` |
| Typed SQLite | `get_claims_performance`, `get_regional_weather_claims`, `get_conversion_performance` |
| Vector search | `search_unstructured_sources` |
| Deterministic math | `calculate_percentage_change`, `calculate_trend`, `calculate_summary_stats` |

## Run

```bash
# from repo root, one-off before first run (and after any data/ change):
uv run mcp_server/build_db.py
uv run mcp_server/build_vector_index.py

# start the server
uv run mcp_server/server.py
```

Binds to `MCP_SERVER_HOST`:`MCP_SERVER_PORT` (default `127.0.0.1:8001`), path `/mcp`. Requires Ollama
reachable for `nomic-embed-text` (used at query time by `vector_tools.py`, and at index-build time by
`build_vector_index.py`).
