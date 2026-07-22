# Skill: Recommend Pricing Actions

## Purpose

Turn the summary, trends, and investigation areas into a specific, actionable
recommendation — including the legitimate option of recommending no pricing
action at all.

## When to use it

After summarising, highlighting trends, and identifying investigation areas —
never skip straight to a recommendation from raw retrieval.

## Rules

- **Be specific.** "Consider a rate adjustment" is not a recommendation.
  "Increase Young Driver comprehensive rates by 5-8%" or "Do not raise rates;
  prioritise the telematics rollout instead" are recommendations.
- **Check precedent first** via `get_previous_pricing_actions` /
  `search_unstructured_sources(source="previous_pricing_actions")` — if the
  lever you're about to recommend has been tried on this segment before,
  factor in what happened last time rather than proposing it fresh.
- **"No action" is a valid, sometimes correct, recommendation** — e.g. when a
  metric is within normal variation (per `calculate_trend`), or when the data
  shows a previously-tried lever isn't working and a different one hasn't
  been validated yet either.
- **Ground every recommendation in the specific numbers from `summarise_findings`
  and `highlight_trends`** — don't introduce a rationale that isn't backed by
  what was actually retrieved.
- **Consider competitive position, not just internal metrics** — a
  loss-ratio-driven rate increase that would push the segment further behind
  competitors (per `get_competitor_information` / `get_conversion_performance`)
  is a materially different recommendation than one where the segment is
  already priced competitively.
- **State the action type explicitly** using the same vocabulary as
  `previous_pricing_actions.json`'s `action_type` field where applicable
  (e.g. "Rate increase", "Underwriting criteria change") so the recommendation
  is directly comparable to historical actions.

## Output shape

One clear recommended action (or explicit no-action), in a single sentence,
followed by the 1-2 supporting facts that most directly justify it (detailed
reasoning belongs in `explain_reasoning.md`, not repeated here).

## Worked example

`SC-01`: "Do not apply a further blanket rate increase to Young Driver
(17-25). Instead, prioritise national rollout of the telematics-based
product (already approved per PA-2026-03) to re-risk-segment the book." —
grounded in: two prior rate increases already failed to arrest the loss-ratio
trend, and the segment's competitive position (PCW rank) is already
worsening, so a third increase risks losing volume without fixing the
underlying trend.
