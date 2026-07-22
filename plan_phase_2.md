# Phase 2: Multi-Agent Collaboration (built) + Continuous Evaluation (not built)

This doc originally sketched two things `challenge.md` calls out as beyond the baseline single-agent
build: the bonus multi-agent architecture, and "continuous evaluation & model drift." **§1 and §2 below are
now built** — `backend/graph.py` implements the 5-agent `StateGraph` and `GraphState` design exactly as
sketched here (see `IMPLEMENTATION.md` §5 and §7, and the root `README.md`, for the as-built description).
They're kept below largely as originally written, for the historical design rationale — the "what changes
in code" paragraph at the end of §1 is the one part that's now superseded by reality (it predates the
`backend/` rename and undersells what actually landed). **§3 (continuous evaluation / model drift) is the
one item from this doc still not built.**

## 1. Multi-agent split (the bonus ask) — built

`challenge.md` names four specialist roles: Market Intelligence Agent, Claims
Analysis Agent, Conversion Analysis Agent, Recommendation Agent. Phase 1's
skills already map cleanly onto these roles — the split is a LangGraph
topology change, not a rewrite of the tools or skills. A 5th agent, the
Orchestration Agent, sits above these four:

| Agent | Skills | MCP tools it's scoped to |
|---|---|---|
| **Orchestration Agent** | new `orchestrate_flow` (routing only — see below) | none directly; it only invokes the 4 agents below |
| Market Intelligence Agent | `retrieve_information`, `summarise_findings`, `highlight_trends` | `list_market_intelligence`, `get_market_intelligence_doc`, `search_unstructured_sources(source="market_intelligence")` |
| Claims Analysis Agent | `retrieve_information`, `highlight_trends`, `identify_investigation_areas` | `get_claims_performance`, `get_regional_weather_claims`, `calculate_trend`, `calculate_summary_stats` |
| Conversion Analysis Agent | `retrieve_information`, `highlight_trends` | `get_conversion_performance`, `get_competitor_information`, `calculate_percentage_change` |
| Recommendation Agent | `recommend_pricing_actions`, `explain_reasoning` | `get_previous_pricing_actions`, `search_unstructured_sources(source="previous_pricing_actions")`, `get_customer_feedback_metrics`, `search_unstructured_sources(source="customer_feedback")` |

**Orchestration Agent**: this is the single entry node in the LangGraph
graph — it receives the analyst's raw query directly from the FastAPI layer
(`POST /chat`), before any specialist runs. Rather than reusing
`master_orchestrator.md` wholesale, it gets its own new skill file,
`skills/orchestrate_flow.md`, whose only job is routing: classify the query
against the 3 analysis domains (market/claims/conversion), decide which of
them are relevant and should run (one, several in parallel, or — for a
narrow factual lookup — just one), and decide when the fanned-in findings
are ready to hand to the Recommendation Agent. It does not carry the 6
phase-skills (`retrieve_information`, `summarise_findings`,
`highlight_trends`, `identify_investigation_areas`,
`recommend_pricing_actions`, `explain_reasoning`) — those now belong to the
specialist agents, since it never calls their tools itself and only needs
enough context to route, not to execute. Its system prompt is built from
just `orchestrate_flow` plus a one-line description of what each of the 4
specialist agents does. This effectively supersedes `master_orchestrator.md`
for Phase 2; that file remains the entry point only for the Phase 1
single-agent architecture.

**Topology**: the Orchestration Agent classifies the analyst's question and
fans out to whichever of the three analysis agents are relevant, in parallel
(LangGraph supports concurrent branches that fan back in). Each analysis
agent runs as its own `create_react_agent` instance, scoped to only its own
tool subset and its own `skill_loader.build_system_prompt([...])` call (the
function already accepts a subset of skill names — this was built into
Phase 1 specifically so this step wouldn't require touching
`skill_loader.py`). Once the analysis agents finish, the Recommendation
Agent receives their **condensed text findings** (not raw tool-call
payloads — same "only pass forward what's needed" context discipline as
Phase 1) and produces the final recommendation + reasoning.

**What changed in code (as built, see `IMPLEMENTATION.md` §5/§7 for the full account)**:
`backend/graph.py` (new) replaces the single `create_react_agent` call with a `StateGraph` wiring the 4
agents + orchestrator; `backend/agent.py`'s SSE stream gained an `agent` field per event plus a new
`routing` event so the frontend can show which specialist is doing what — `ActivityPanel.tsx`'s Trace tab
groups cards per agent with a routing banner, and a new Agents tab documents all 5. `mcp_server/` and the
data layer are untouched, and `skills/*.md` gained one new file (`orchestrate_flow.md`) rather than any
existing skill file changing. One implementation detail this section didn't anticipate: the routing
decision itself needed the same `PydanticOutputParser`-based workaround as the final answer, since
`with_structured_output` doesn't work reliably against `gpt-oss:120b-cloud` — see `IMPLEMENTATION.md` §6.

## 2. State management across agents — built

Each agent needs its own scoped context, not the whole conversation. LangGraph's
`StateGraph` already models this naturally as a `TypedDict` schema where nodes
read/write specific keys — the design below just makes that scoping explicit,
including when state is emptied vs. carried forward.

**Shared graph state** (`backend/graph.py`, as built):

```python
class GraphState(TypedDict):
    query: str                        # the analyst's question for this turn
    routing: list[str]                # orchestrator's decision, e.g. ["claims", "market"]
    market_findings: str | None        # written only by Market Intelligence Agent
    claims_findings: str | None        # written only by Claims Analysis Agent
    conversion_findings: str | None    # written only by Conversion Analysis Agent
    final_answer: dict | None          # PricingAnalysis dict, written only by Recommendation Agent
```

Each specialist node reads `query` (and `routing`, to know if it was even called)
and writes to exactly one field — its own condensed findings string. Because the
three specialist fields are disjoint keys, LangGraph's default dict-merge
behavior lets the parallel branches fan in without a custom reducer: nothing
requires ordering or accumulation between them. The Recommendation Agent reads
whichever of `market_findings`/`claims_findings`/`conversion_findings` are
non-`None` and writes `final_answer`.

**Per-agent scratchpad vs. shared state — two different lifetimes**: within
one specialist's own `create_react_agent` invocation, its internal tool-call
messages (the back-and-forth of calling `get_claims_performance`, reading the
result, calling `calculate_trend`, etc.) live only in that sub-agent's own
local message list, never in `GraphState`. Only its final condensed answer
(one string) gets written back to its `GraphState` field. This is what keeps
each agent's context "relevant to it": a specialist's noisy tool-call trace is
discarded the moment it returns — the orchestrator and Recommendation Agent
never see it, only the distilled finding, matching the existing "condensed
text findings, not raw tool-call payloads" discipline from section 1.

**Emptying and refilling — two distinct lifecycles**:

1. **Within a single question/turn** (what Phase 1 and this Phase 2 design
   both need): `GraphState` is constructed fresh, all fields empty, for every
   `POST /chat` call — same as today's `stream_query()` building a new
   `inputs` dict per call. If the Orchestration Agent's routing decision skips
   a specialist (e.g. a pure claims question doesn't need Market or
   Conversion), that specialist's field is simply never written — no explicit
   clearing needed, since it started empty and that agent's node never runs.

2. **Across turns, if multi-turn/follow-up conversations are added later**
   (not built in Phase 1 or elsewhere in this doc, but the natural next
   question once state is shared): this would need a LangGraph checkpointer
   to persist `GraphState` between turns in a session, and an explicit rule
   for what survives a new turn vs. what gets wiped:
   - **Carried forward**: a running `messages` history (analyst + final
     answers only, using LangGraph's `add_messages` reducer) so follow-ups
     like "what about that segment last quarter" can be resolved.
   - **Reset to `None` at the start of every new turn**, before the
     Orchestration Agent routes the new question: `routing`,
     `market_findings`, `claims_findings`, `conversion_findings`,
     `final_answer`. These are per-question artifacts; letting last turn's
     claims findings leak into an unrelated follow-up about competitors would
     violate the same "keep context minimal" constraint `master_orchestrator.md`
     already states for single-agent Phase 1 — here it's enforced at the graph
     level (the orchestrator node clears these fields as its first action each
     turn) rather than within one agent's own reasoning.

## 3. Continuous evaluation & model drift

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
