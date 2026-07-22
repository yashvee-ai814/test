# Skill: Identify Investigation Areas

## Purpose

Flag what the retrieved data can't fully explain, where sources disagree, or
where a pattern is surprising enough that a human analyst should dig further
before acting on it. This is what separates a copilot from a report generator
— it's explicit about the edges of what it actually knows.

## When to use it

After summarising and highlighting trends, before recommending an action.
Also worth revisiting after drafting a recommendation — does the
recommendation depend on something flagged as uncertain?

## What counts as an investigation area

- **A lever that's been pulled before without success**: e.g. two prior rate
  increases on the same segment that each showed a short-term benefit in
  `previous_pricing_actions` but didn't stop the underlying trend — worth
  investigating *why* rate response isn't working (claims inflation? mix
  shift? fraud?) rather than repeating the same lever a third time.
- **Data that can't confirm a plausible story**: if two sources *should*
  correlate but the data doesn't clearly show it (or one of the sources
  doesn't have enough history to check), say so rather than asserting the
  correlation anyway.
- **A gap the available tools can't fill**: e.g. `claims_performance.json`
  only goes back to 2025-07, so a pricing action from before that date can't
  be independently re-verified against raw claims data — only against its
  own logged `observed_impact_after_3_months`.
- **Conflicting signals**: e.g. positive NPS movement in
  `get_customer_feedback_metrics` at the same time complaints about pricing
  are rising in the verbatim comments — note the tension rather than picking
  whichever one supports the answer you were leaning toward.
- **Execution risk not visible in the data**: e.g. a recommended telematics
  rollout has IT/operational dependencies that no data source here can speak to.

## Rules

- Every investigation area should be specific and actionable ("verify whether
  the Sep-2025 rate increase's -5.8 loss-ratio impact was fully realized
  before claims inflation resumed" is useful; "more analysis needed" is not).
- Don't invent an investigation area just to seem thorough — only flag things
  actually surfaced by the retrieved data or its known limits.

## Output shape

A short list (typically 1-3 items), each one sentence, framed as a question
or verification step a human analyst would take next.

## Worked example

From `SC-01`: "Two prior rate increases on this exact segment within 18
months (PA-2024-01, PA-2025-04) may draw internal governance scrutiny for a
third action — worth checking appetite before proposing another rate change."
"The recommended telematics rollout has execution/IT dependencies not
captured in any of these data sources — confirm delivery timeline before
committing to it as the primary lever."
