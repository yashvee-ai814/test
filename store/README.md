# store

Generated, gitignored — everything here is derived from `data/` and can be deleted and rebuilt at any time.
Nothing in this folder is hand-edited; nothing outside `mcp_server/` reads it directly (`backend` never
touches SQLite or Chroma itself, only `mcp_server`'s tools do).

| Path | Produced by | Read by |
|---|---|---|
| `pricing_copilot.db` | `uv run mcp_server/build_db.py` | `mcp_server/sql_tools.py` (typed queries only — no raw-SQL tool exists) |
| `chroma/` | `uv run mcp_server/build_vector_index.py` | `mcp_server/vector_tools.py`'s `search_unstructured_sources` |

## Rebuilding

```bash
uv run mcp_server/build_db.py
uv run mcp_server/build_vector_index.py
```

Run both after any change to `data/`. `build_db.py` also re-verifies row counts and segment-name
cross-references as part of the build (see `data/README.md`'s ground rules) — if it fails, the source JSON
changed in a way that broke an assumption the rest of the system relies on, not a bug in the loader itself.
