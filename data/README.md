# data

Pristine synthetic source data for Aviva UK Private Car Motor Insurance — JSON + markdown, hand-authored to
be internally consistent (cross-referenced segment names, ids, dates) so retrieval and math results are
independently checkable against these files. **Never write derived/generated state here** — `mcp_server`'s
build scripts read these files and write their output to `store/` (gitignored), which is always safe to
delete and rebuild; `data/` itself should never change as a side effect of running the app.

## Files

| File | Shape | Backs |
|---|---|---|
| `claims_performance.json` | `records`: 48 rows (segment × product line × month, 12 months) · `regional_weather_claims`: 60 rows (region × month) | `get_claims_performance`, `get_regional_weather_claims` |
| `conversion_performance.json` | `records`: 144 rows (segment × channel × month) | `get_conversion_performance` |
| `competitor_information.json` | `records`: 24 rows (risk profile × quarter) | `get_competitor_information` |
| `previous_pricing_actions.json` | `records`: 10 rows, each with structured fields *and* a free-text `rationale` | `get_previous_pricing_actions` (structured fields) + `search_unstructured_sources(source="previous_pricing_actions")` (the `rationale` text, embedded) |
| `customer_feedback.json` | `monthly_metrics`: 12 rows (NPS/CSAT/complaints) · `verbatim_comments`: 10 free-text comments | `get_customer_feedback_metrics` (metrics) + `search_unstructured_sources(source="customer_feedback")` (comments, embedded) |
| `unstructured_market_intelligence.json` | `records`: 18 rows, structured index (id/date/source/type/sentiment/tags) | `list_market_intelligence` |
| `unstructured_market_intelligence/*.md` | 18 markdown files, one per intelligence item, full prose | `get_market_intelligence_doc(id)` (raw file) + `search_unstructured_sources(source="market_intelligence")` (embedded) |
| `demo_scenarios.json` | 10 worked scenarios, each with a trigger query, expected findings/recommendation/reasoning, and a `verification_note` | `list_demo_scenarios` — but **only** `scenario_id`/`title`/`analyst_trigger_query` are exposed through it (see below); the rest is the golden set worked examples in `skills/*.md` are grounded against, and what a future eval harness (`plan_phase_2.md` §2a) would run against |

`unstructured_market_intelligence.json` and `unstructured_market_intelligence/*.md` are the same 18 items in
two forms — one structured index for filter-style questions, one full prose per item for semantic search
and drill-down. This is the clearest example in the repo of "pick the retrieval technique by the shape of
the *question*, not by which file the data lives in" — see the root `README.md`'s data retrieval diagram.

**Worth noting**: `demo_scenarios.json`'s scenarios already carry a `specialist_agents_involved` field
(e.g. `SC-01` lists `["Claims Analysis Agent", "Conversion Analysis Agent", "Market Intelligence Agent",
"Recommendation Agent"]`) — the synthetic data was authored anticipating exactly this multi-agent split
before `backend/graph.py` existed, which is a useful independent check that the implemented routing
(`skills/orchestrate_flow.md`, `graph.py`'s `SPECIALISTS`) lines up with how the scenarios were designed.

**Why `list_demo_scenarios` only exposes the question, not the answer**: `key_findings`,
`recommended_action`, `reasoning`, `specialist_agents_involved`, `risk_flags`, `verification_note`, and
`demo_narrative_tip` are deliberately withheld from that tool (`mcp_server/json_tools.py`). If a real
analyst question happened to match one of these 10 scenarios, exposing the recorded answer would let the
Recommendation Agent parrot it instead of actually deriving it from the data tools — and would poison any
future eval harness run against this same golden set (`plan_phase_2.md` §2a), since the model would have
already seen the expected answer.

## Ground rules (established generating this data — verify before changing anything here)

- **Segment name strings must stay byte-identical** across `claims_performance.json` and
  `conversion_performance.json`: `"Young Driver (17-25)"`, `"Standard (26-45)"`, `"Experienced (46-65)"`,
  `"Senior (66+)"`. A typo in either file silently breaks any cross-source correlation an agent tries to do
  (e.g. claims + conversion for the same segment), since there's no join tool — the agent correlates by
  matching these strings itself.
- **`claims_performance.json`'s per-record `region` field is a rotating label, not a real per-region
  breakdown.** `regional_weather_claims` is the genuine regional axis. Both `mcp_server/sql_tools.py`'s
  docstring and `skills/master_orchestrator.md`/`retrieve_information.md` call this out explicitly so an
  agent doesn't misuse it for a regional question.
- **`conversion_performance.json`'s `average_pcw_rank` is genuinely absent (not `null`) on non-PCW-channel
  rows** — only the Price Comparison Website channel has a "rank" concept. Handled in the SQLite loader via
  `.get()` with a `NULL` default, not by adding a placeholder value to the source JSON.
- **If regenerating any file here, re-verify row counts, segment-name matches, and id cross-references
  afterward** — see `mcp_server/build_db.py`'s own verification step (run as part of the build) for the
  pattern to follow. Never let new content elsewhere in the repo (skill files, UI copy) assert a number that
  isn't actually traceable back to one of these files.

## Regenerating derived state after a change here

```bash
uv run mcp_server/build_db.py           # JSON -> SQLite (store/pricing_copilot.db)
uv run mcp_server/build_vector_index.py # embeds the 3 free-text sources into Chroma (store/chroma/)
```

See `store/README.md` for what these produce.
