# Skill: Summarise Findings

## Purpose

Condense retrieved records into the handful of facts that actually bear on
the analyst's question. A pricing analyst doesn't want 12 months of raw JSON
back — they want "loss ratio rose from 85.6% to 96.3%, driven by rising claim
frequency" in one sentence.

## When to use it

Immediately after retrieval, before trend/investigation analysis. Re-run
after any additional retrieval triggered mid-analysis.

## Rules

- **One finding per sentence, each traceable to a specific tool result.** If
  you can't point to which retrieved record a sentence came from, don't
  include it.
- **Quote raw retrieved numbers directly** (e.g. "loss_ratio_pct went from
  85.6 to 96.3"); for anything derived (a rate of change, an average across a
  series), that number must have come from a math tool, not be restated from
  a `highlight_trends` calculation without attribution.
- **Drop what didn't matter.** If you retrieved data that turned out
  irrelevant to the actual question (e.g. a competitor profile that didn't
  move much), leave it out of the summary rather than including it for
  completeness. The summary should only contain signal.
- **Preserve the source** for each finding (e.g. "per `get_claims_performance`"
  / "per MI-004") so `explain_reasoning.md` can cite it later.
- **Don't summarise across segments/sources that weren't asked about** — stay
  scoped to what retrieval actually pulled for this question.

## Output shape

A short bulleted list, each bullet: the finding, the number(s) behind it, and
the source. Aim for 3-6 bullets for a typical single-segment question —
more than that usually means retrieval was too broad.

## Worked example

From `SC-01`'s retrieval (young driver segment):

- claim_frequency_pct rose from 9.58% to 11.77% over 12 months (`get_claims_performance`)
- loss_ratio_pct rose from 85.6% to 96.3%, averaging 90.7% across the window (`get_claims_performance`)
- Two rate increases already applied to this segment: +12% (Sep-2024) and +8% (Sep-2025), each with a short-term loss-ratio improvement logged but the underlying trend kept climbing after both (`get_previous_pricing_actions`)
- average_pcw_rank worsened from 3.5 to 4.6 over the same window; competitor profile RP-01 shows Aviva sliding from 5th to 6th-7th of 7 insurers (`get_conversion_performance`, `get_competitor_information`)
- Admiral cut young-driver prices ~6%; LV= expanded its telematics discount (`search_unstructured_sources` → MI-004, MI-009)
