# Aviva Pricing Analyst Copilot — Project Context

## The challenge

This repo is working towards Challenge B in [challenge.md](challenge.md): build an AI agent that acts as a **Pricing Analyst Copilot**, bringing together information from multiple sources to generate and explain pricing recommendations. Required capabilities: retrieve from multiple sources, summarise findings, highlight trends, identify areas needing investigation, recommend pricing actions, explain the reasoning, and support continuous evaluation / model drift monitoring. Bonus: specialist agents collaborating (Market Intelligence Agent, Claims Analysis Agent, Conversion Analysis Agent, Recommendation Agent). Needs to be presentable as a 15-20 min demo.

## Current state

Only the synthetic data has been built so far — **no application/agent code exists yet**, and no tech stack has been chosen. The domain is UK Private Car Motor Insurance, Aviva-flavoured. All of it is deliberately internally consistent and cross-checked (see "Ground rules" below) rather than just plausible-looking.

## Data layout (`data/`)

- **`claims_performance.json`** — monthly claims by segment (`Young Driver (17-25)`, `Standard (26-45)`, `Experienced (46-65)`, `Senior (66+)`): frequency, severity, loss ratio, earned premium, over a 12-month window (2025-07 to 2026-06). Loss ratios are realistic (56-96% range, Young Driver worsening over the window). Also contains a **`regional_weather_claims`** array — an independent region-level axis (separate from the per-segment `region` field) with a deliberate storm-driven spike in Oct/Nov 2025 for North of England & Scotland & NI only.
- **`conversion_performance.json`** — quote-to-bind conversion by channel (PCW / Direct / Broker) × the **same 4 segments** as claims. Segment name strings must match claims exactly — the two files are meant to be joined on that field. PCW rows also carry `average_pcw_rank`.
- **`competitor_information.json`** — quarterly premium benchmarking vs 6 named UK competitors across 6 rating profiles (`RP-01`..`RP-06`). RP-01 (young-driver profile) and RP-04 (senior profile) carry a deliberate extra Aviva-specific drift so their rank trend agrees with the matching segment's story in `conversion_performance.json`, rather than drifting independently.
- **`unstructured_market_intelligence.json`** — a structured *index* (18 records, `MI-001`..`MI-018`: id/date/source/sentiment/tags). Its `content` field is a one-line summary only.
- **`unstructured_market_intelligence/`** — the genuinely unstructured data: 18 markdown files (`MI-001_*.md` .. `MI-018_*.md`), one real "raw document" per intel item (news article / regulatory bulletin / analyst report / social post), 1:1 with the JSON index by id. Every number in these files was checked to match the JSON exactly.
- **`previous_pricing_actions.json`** — 10 historical pricing/underwriting actions (`PA-2024-01`..`PA-2026-03`) with rationale and a logged `observed_impact_after_3_months`. The most recent action's impact fields are `null` on purpose (too recent to measure) — not a data gap to fill in.
- **`customer_feedback.json`** — monthly NPS/CSAT/complaint-volume metrics plus 10 verbatim comments (`CF-001`..`CF-010`).
- **`demo_scenarios.json`** — 10 presentation scenarios (`SC-01`..`SC-10`) for demoing the finished agent to a pricing-analyst audience. Each cites specific ids/numbers from the other files and carries a `verification_note` explaining exactly what was checked against the real data and what the data can't support. **Read a scenario's `verification_note` before trusting its narrative claims** — several numbers in early drafts were wrong and had to be corrected against the actual files.

## Ground rules (established the hard way — don't relearn these)

- **Never let new narrative content (scenarios, docs, prompts) assert a number that isn't actually in the data.** Earlier drafts described loss ratios as "95%+" when the real formula produced ~17-26%, and referenced a "Senior" conversion segment that didn't exist under that name. Both were only caught by writing a small script that loads the JSON and checks the specific claim — not by re-reading the prose. Do this before building anything (prompts, eval sets, UI copy) on top of the data.
- Segment name strings (`"Young Driver (17-25)"`, `"Standard (26-45)"`, `"Experienced (46-65)"`, `"Senior (66+)"`) must stay byte-identical across `claims_performance.json` and `conversion_performance.json`.
- Before claiming two data files "tell the same story" (e.g. a segment's claims trend and its competitor rank both worsening), actually check it — independently-generated random data can easily drift in unrelated directions even when the narrative intends otherwise.
- Check that a field genuinely supports the comparison you want before using it: `claims_performance.json`'s per-segment `region` field is just a rotating label, not a real per-region breakdown — `regional_weather_claims` is the real independent regional axis.
- If regenerating any of the JSON files, re-verify everything afterward (segment-name match, id cross-references between `demo_scenarios.json` and the source files, numeric sanity ranges) rather than assuming a re-run is safe — inserting new randomness earlier in a generator script shifts every downstream draw.

## Not yet built

- The actual agent/application: retrieval across the 6 sources above, summarisation, trend-highlighting, recommendation generation with explained reasoning, and the continuous-evaluation/model-drift capability.
- The bonus multi-agent architecture referenced in `demo_scenarios.json`'s `specialist_agents_involved` fields (Market Intelligence Agent, Claims Analysis Agent, Conversion Analysis Agent, Recommendation Agent) — these are planned roles the scenarios were written around, not implemented agents.
- No tech stack, framework, or UI has been chosen yet — open to discussion.

## Working style

- The user wants any synthetic/demo content to be provably grounded in the actual data files — verify with a script, don't eyeball it, and say explicitly what a check can't confirm rather than overstating confidence.
- Keep each data source as its own file/folder rather than merging them.
