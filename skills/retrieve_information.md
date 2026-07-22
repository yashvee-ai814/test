# Skill: Retrieve Information

## Purpose

Pull the specific records needed to answer the analyst's question from the
right tool(s) — and only those records. This is the foundation the other five
skills build on: a bad or bloated retrieval produces a bad summary, a false
trend, or a recommendation that isn't actually grounded in the data.

## When to use it

First step for almost every analyst question. Re-invoke mid-conversation if a
later phase (e.g. `identify_investigation_areas.md`) surfaces a need for more
data than was originally retrieved.

## How to choose the right tool

Match the technique to what the question is actually asking, not just the
topic:

| Question shape | Tool |
|---|---|
| "What's the loss ratio / claim frequency / conversion trend for segment X?" | `get_claims_performance`, `get_conversion_performance` |
| "What's the weather/regional claims picture?" | `get_regional_weather_claims` (not the `region` field on claims records) |
| "How do we compare to competitors on profile Y?" | `get_competitor_information` |
| "Have we changed price on this segment before? What happened?" (structured: when, how much) | `get_previous_pricing_actions` |
| "Have we ever done something like X before?" (the *reasoning*, not just the fact) | `search_unstructured_sources(source="previous_pricing_actions")` |
| "What are customers saying about renewals/claims/service?" | `search_unstructured_sources(source="customer_feedback")` for the actual words; `get_customer_feedback_metrics` for the aggregate NPS/CSAT numbers |
| "What's happening in the market / with competitors / regulators?" | `list_market_intelligence` if you know the type/sentiment/date filter you want; `search_unstructured_sources(source="market_intelligence")` if it's a topic/semantic question |
| "Tell me more about market intel item MI-00X" | `get_market_intelligence_doc(id)` |

## Rules

- **Filter narrowly.** Pass `segment`, `period_from`/`period_to`, `channel`,
  etc. — don't fetch all segments or all 12 months when the question is about
  one segment and one recent quarter.
- **Prefer typed filters over semantic search when the question is structured**
  (a specific segment, date range, or action type) — semantic search is for
  when you can't express the question as a filter.
- **Two-step for market intelligence full text**: use `list_market_intelligence`
  or `search_unstructured_sources` first to find the right `id`, then
  `get_market_intelligence_doc(id)` only for the item(s) that actually matter —
  don't pull every document's full text speculatively.
- **Cross-source questions need multiple calls**, not one — there is no join
  tool. Call each relevant typed tool and correlate the results yourself.

## Output shape

Pass along only the fields relevant to the question, not the raw tool
response verbatim. E.g. for a trend question, keep `period` + the metric in
question, and drop `policies_in_force`, `earned_premium_gbp`, etc. if they
weren't asked about.

## Worked example

Scenario `SC-01` ("why is young driver loss ratio worsening"): the right
retrieval calls are `get_claims_performance(segment="Young Driver (17-25)")`
for the 12-month trend, `get_conversion_performance(segment="Young Driver
(17-25)", channel="Price Comparison Website")` for the PCW rank trend,
`get_competitor_information(profile_id="RP-01")` for the matching competitor
profile, `get_previous_pricing_actions(segment_affected="Young Driver
(17-25)")` for prior actions, and `search_unstructured_sources(query="young
driver telematics competitor pricing")` for market context. Note what's *not*
retrieved: other segments' claims data, the Broker/Direct conversion channels,
customer feedback — none of it is relevant to this specific question.
