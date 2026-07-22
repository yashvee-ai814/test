# Skill: Highlight Trends

## Purpose

Turn a retrieved time series into a precise, computed statement of direction
and magnitude — "increasing at ~0.2 percentage points per month over 12
months" — rather than an eyeballed impression. This is where the "no mental
arithmetic" rule matters most: trend claims are exactly the kind of
multi-point calculation LLMs get subtly wrong.

## When to use it

Whenever a finding involves a series of 3+ data points over time (a 12-month
metric, a set of quarterly competitor positions, etc.), or a before/after
comparison (2 points).

## Rules

- **Always call a math tool — never state a trend from reading the numbers
  yourself.** Use `calculate_trend(values)` for a series of 3+ points (gives
  direction, first/last/min/max/mean, average change per period). Use
  `calculate_percentage_change(start_value, end_value)` for a simple
  before/after comparison.
- **Pass the actual retrieved values in order**, not rounded or approximated
  versions of them.
- **State both the direction and the magnitude** — "worsening" alone is
  weaker than "worsening, from 85.6% to 96.3%, averaging +0.89pp/month."
- **Distinguish a genuine trend from noise.** A `calculate_trend` result with
  a small `average_change_per_period` relative to the spread of the data
  (`min`/`max`) is closer to flat than trending — say so rather than forcing
  a narrative onto a small movement.
- **Cross-reference trends across sources when relevant** — e.g. does the
  claims trend line up with the competitor-rank trend for the same segment?
  Call `calculate_trend`/`calculate_percentage_change` separately on each
  series; there's no single tool that compares two series for you, so state
  each trend and note the relationship yourself.

## Output shape

For each trend: the metric, the tool output (direction, first, last,
average change per period), and one sentence of plain-English interpretation.

## Worked example

`get_claims_performance(segment="Young Driver (17-25)")` returns 12 monthly
`loss_ratio_pct` values. Call `calculate_trend([85.6, ..., 96.3])`:

```
{"direction": "increasing", "first": 85.6, "last": 96.3, "min": 85.6,
 "max": 96.3, "mean": 90.7, "total_change": 10.7, "average_change_per_period": 0.97}
```

→ "Loss ratio is on a sustained upward trend — up 10.7 points over the
12-month window (85.6% → 96.3%), averaging just under 1 point of
deterioration per month, with no month showing improvement (min equals the
first value)." Separately, `calculate_percentage_change` on
`average_pcw_rank` (3.5 → 4.6) gives a +31.4% relative worsening in
comparison rank over the same window — both trends move the same direction,
which is itself a finding worth stating explicitly.
