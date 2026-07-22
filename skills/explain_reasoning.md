# Skill: Explain Reasoning

## Purpose

Make the recommendation's logic fully auditable: which specific numbers, from
which specific sources, led to this conclusion and not a different one. A
pricing analyst (and their governance reviewers) need to be able to check
your work, not just trust the conclusion.

## When to use it

Always the final step, immediately after stating a recommendation.

## Rules

- **Cite the specific numbers and their source tool/id** — "loss ratio rose
  10.7 points over 12 months (`get_claims_performance`)", "MI-004: Admiral
  cut young-driver prices ~6%" — not vague references to "the data."
- **Explain why this recommendation and not the obvious alternative.** If the
  obvious move would be "raise rates again" but the recommendation is
  something else, say explicitly why the obvious move was rejected (e.g. it's
  been tried twice already and didn't arrest the trend).
- **Connect cause and effect explicitly**: state the mechanism, not just the
  correlation — e.g. "a third rate increase risks losing more volume than it
  recovers in loss ratio, because PCW rank is already sliding" is a
  mechanism; "the data suggests a rate increase" is not.
- **Reference the investigation areas** if any of them materially affect
  confidence in the recommendation (e.g. "this recommendation assumes the
  telematics rollout timeline holds — see investigation area above").
- **Keep it tight** — this is the "why," not a restatement of the full
  summary. Aim for 2-4 sentences that a reviewer could check line-by-line
  against the cited sources.

## Output shape

A short paragraph (2-4 sentences), each sentence traceable to a specific
number/source already established in the summary or trend analysis.

## Worked example

`SC-01`: "Two consecutive rate increases (PA-2024-01: +12%, PA-2025-04: +8%)
each delivered their own logged short-term loss-ratio benefit, but claim
frequency and loss ratio both kept climbing afterwards and reached new highs
by 2026-06 — meaning underlying claims inflation is outpacing the rate
response, not that pricing is too low. Meanwhile average_pcw_rank worsened
from 3.5 to 4.6 over the same window and Aviva's market rank on the closest
matching competitor profile (RP-01) slid from 5th to 6th-7th of 7 — a further
increase risks losing volume faster than it improves loss ratio. Competitors
are already differentiating on risk segmentation rather than price (Admiral's
cut, LV='s telematics expansion per MI-004/MI-009), which is why telematics
rollout — not another rate rise — is the recommended lever."
