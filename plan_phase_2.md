# Phase 2 (not built): Multi-Agent Collaboration + Continuous Evaluation

Phase 1 (this codebase) ships a single orchestrator agent using all 12 MCP
tools and all 7 skills. `challenge.md` also calls out two things Phase 1
deliberately leaves out: the bonus multi-agent architecture, and "continuous
evaluation & model drift." This doc sketches how to build both without
redoing Phase 1's foundations.

## 1. Multi-agent split (the bonus ask)

`challenge.md` names four specialist roles: Market Intelligence Agent, Claims
Analysis Agent, Conversion Analysis Agent, Recommendation Agent. Phase 1's
skills already map cleanly onto these roles — the split is a LangGraph
topology change, not a rewrite of the tools or skills:

| Agent | Skills | MCP tools it's scoped to |
|---|---|---|
| Market Intelligence Agent | `retrieve_information`, `summarise_findings`, `highlight_trends` | `list_market_intelligence`, `get_market_intelligence_doc`, `search_unstructured_sources(source="market_intelligence")` |
| Claims Analysis Agent | `retrieve_information`, `highlight_trends`, `identify_investigation_areas` | `get_claims_performance`, `get_regional_weather_claims`, `calculate_trend`, `calculate_summary_stats` |
| Conversion Analysis Agent | `retrieve_information`, `highlight_trends` | `get_conversion_performance`, `get_competitor_information`, `calculate_percentage_change` |
| Recommendation Agent | `recommend_pricing_actions`, `explain_reasoning` | `get_previous_pricing_actions`, `search_unstructured_sources(source="previous_pricing_actions")`, `get_customer_feedback_metrics`, `search_unstructured_sources(source="customer_feedback")` |

**Topology**: a supervisor node (the existing `master_orchestrator` skill,
reused as-is) classifies the analyst's question and fans out to whichever of
the three analysis agents are relevant, in parallel (LangGraph supports
concurrent branches that fan back in). Each analysis agent runs as its own
`create_react_agent` instance, scoped to only its own tool subset and its own
`skill_loader.build_system_prompt([...])` call (the function already accepts
a subset of skill names — this was built into Phase 1 specifically so this
step wouldn't require touching `skill_loader.py`). Once the analysis agents
finish, the Recommendation Agent receives their **condensed text findings**
(not raw tool-call payloads — same "only pass forward what's needed" context
discipline as Phase 1) and produces the final recommendation + reasoning.

**What changes in code**: `agent_api/graph.py` (new) replaces the single
`create_react_agent` call in `agent.py` with a `StateGraph` wiring the 4
agents + supervisor; `agent_api/app.py`'s SSE stream gains an `agent` field
per event so the frontend can show which specialist is doing what (the trace
UI already renders arbitrary tool events, so this is additive, not a
rewrite). `mcp_server/`, `skills/*.md`, and the data layer are untouched.

## 2. Continuous evaluation & model drift

Two distinct concerns worth separating:

**a) Answer-quality regression testing (eval), not drift** — `demo_scenarios.json`'s
10 scenarios already function as a golden set: each has an
`analyst_trigger_query`, `key_findings`, `recommended_action`, `reasoning`,
and a `verification_note` stating exactly what's checked against real data.
A Phase 2 eval harness would run the agent against all 10 trigger queries and
score the output against `key_findings`/`recommended_action` (e.g. via an
LLM-as-judge comparing the agent's recommendation against the scenario's, or
simpler: assert the agent's answer cites the same specific numbers/ids the
scenario's `verification_note` confirms are real). Run this in CI on every
change to `skills/*.md`, tool docstrings, or the underlying data.

**b) Actual model/data drift monitoring** — this only matters once the
system is live against a real, changing database rather than a static
synthetic snapshot. Two things would need to be tracked over time: (1) *data
drift* — do retrieved distributions (e.g. loss ratio by segment) shift
significantly month over month in ways that should trigger a re-look at
pricing, independent of whether the agent is asked; (2) *agent drift* — does
the agent's tool-selection/recommendation behavior change when the
underlying chat model is upgraded (a real risk here, since `llm.py` already
makes the model swappable via `OLLAMA_CHAT_MODEL`). The eval harness from (a)
is also the regression check for (2): re-run it whenever the model changes
and diff the results.

Neither of these needs new data sources — they need a harness (a script that
runs the 10 scenarios and scores the output) and, for (b), a place to log
agent runs over time for comparison. Out of scope for Phase 1 because there's
no live/changing data yet to actually drift against.
