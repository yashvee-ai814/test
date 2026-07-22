# skills

Markdown files that become part of an agent's **system prompt at request time** — this is the agent's own
runtime instruction set, read by `backend/skill_loader.py`, not developer documentation (that's
`IMPLEMENTATION.md` and the per-service `README.md`s). Nothing in this folder is imported as code;
`build_system_prompt(skill_names)` just reads the given files' raw text and concatenates them, in order,
separated by `\n\n---\n\n`.

## Why skills instead of a hardcoded prompt

`backend/agent.py` never contains a system prompt string. Every behavior change — a new rule, a corrected
worked example, a newly-discovered data quirk the agent needs to know about — is a change to one of these
files, not to Python. This also happens to be exactly what makes the 5-agent split (below) cheap: since
`build_system_prompt` already took a `skill_names` subset (not a hardcoded constant) from the very first,
single-agent version of this project, giving each specialist agent only its own skill files required zero
changes to `skill_loader.py` itself — see `IMPLEMENTATION.md` §5.

## The 9 files

| File | Purpose |
|---|---|
| `master_orchestrator.md` | The original Phase-1 single-agent instructions: full tool inventory, the retrieve→summarise→trend→investigate→recommend→explain workflow, hard constraints. Still used if `skill_loader.build_system_prompt()` is called with no arguments (its default is `ALL_SKILLS`), but no longer wired into `backend/graph.py`'s 5-agent graph — kept for reference / as a fallback single-agent entry point. |
| `orchestrate_flow.md` | Routing only. The Orchestration Agent's entire prompt — classify the question into a subset of `{market, claims, conversion}`, or none if the question is about customer feedback/prior pricing actions, or a meta-question about the copilot itself. No tools, so no "which tool to call" content — its structure is Purpose / the agents it routes to / how to decide / rules / worked examples rather than the 5-part template below. |
| `retrieve_information.md` | How to pick the right MCP tool for a question shape, filter narrowly, and not fetch more than asked. |
| `summarise_findings.md` | Condense retrieved records into the handful of facts that matter. |
| `highlight_trends.md` | Route any numeric trend through `calculate_trend`/`calculate_percentage_change` rather than eyeballing it. |
| `identify_investigation_areas.md` | Flag what the data can't explain or where sources disagree. |
| `recommend_pricing_actions.md` | Turn findings into one specific action (or an explicit no-action), grounded in precedent (`get_previous_pricing_actions`) and competitive position. |
| `explain_reasoning.md` | State *why* — cite the specific numbers/sources, and explain why the obvious alternative was rejected. |
| `describe_capabilities.md` | Answer meta-questions about the copilot itself ("what can you do," "give me example scenarios") via `list_demo_scenarios` — never invented examples. Only skill that isn't answering a data question. |

## The shared template

Every file except `orchestrate_flow.md` (which doesn't retrieve or produce output the same way) follows the
same shape, so a skill file is directly checkable against real data rather than being aspirational prose:

1. **Purpose** — what this phase is for and why it matters to the phases after it.
2. **When to use it** — when in the workflow this applies.
3. **Rules** — the concrete dos/don'ts, often naming an exact tool or field.
4. **Output shape** — what the result of this phase should look like before the next phase consumes it.
5. **Worked example** — grounded in a real `demo_scenarios.json` scenario (usually `SC-01`), so the rule can
   be checked against actual retrieved numbers, not just read as prose.

## Which agent loads which subset

`backend/graph.py`'s `SPECIALISTS` dict (plus `RECOMMEND_SKILLS`) is the authoritative mapping; this table
mirrors it:

| Agent | Skills loaded |
|---|---|
| Orchestrator | `orchestrate_flow` |
| Market Intelligence | `retrieve_information`, `summarise_findings`, `highlight_trends` |
| Claims Analysis | `retrieve_information`, `highlight_trends`, `identify_investigation_areas` |
| Conversion Analysis | `retrieve_information`, `highlight_trends` |
| Recommendation | `recommend_pricing_actions`, `explain_reasoning`, `describe_capabilities` |

Note `retrieve_information.md` and `highlight_trends.md` are each shared by multiple specialists — the same
file, loaded into more than one agent's separate system prompt. This is intentional reuse (one file, many
consumers) rather than duplication: `retrieve_information.md`'s "how to choose the right tool" table
mentions tools across *all* domains (since it's a shared reference), but each specialist is still only ever
bound to its own tool subset at the LangChain level — if a specialist's own reasoning leads it to try a tool
outside that subset, the call is rejected by its `create_react_agent`'s `ToolNode`, not silently allowed
(observed once during testing: the Market Intelligence Agent tried `get_claims_performance` and got a clean
rejection error, then continued using its actual tools).

## Editing these files

Changing agent behavior means editing the relevant `.md` file, not `backend/agent.py` or `backend/graph.py`
— skills, not hardcoded prompts. If you add a rule that references a number or field name, verify it
against the actual `data/*.json` first (see `data/README.md`'s ground rules) rather
than trusting it looks right — this is the same discipline the existing worked examples already follow.
