"""Deterministic calculation tools. LLMs are unreliable at exact arithmetic
over multi-point series - any trend, delta, or summary-statistic claim the
agent makes should come from calling one of these, not from doing the math
itself, extending the same "never assert a number you haven't actually
derived from the data" rule to computed numbers, not just retrieved ones.
"""

import statistics


def calculate_percentage_change(start_value: float, end_value: float) -> dict:
    """Absolute and percentage change from a start value to an end value,
    e.g. loss_ratio_pct at the start vs end of a 12-month window.
    """
    absolute_change = end_value - start_value
    percentage_change_pct = (absolute_change / start_value * 100) if start_value else None
    return {
        "start_value": start_value,
        "end_value": end_value,
        "absolute_change": round(absolute_change, 4),
        "percentage_change_pct": round(percentage_change_pct, 4) if percentage_change_pct is not None else None,
    }


def calculate_trend(values: list[float]) -> dict:
    """Direction and magnitude of a trend across an ordered series of values
    (e.g. 12 months of claim_frequency_pct). Returns direction
    (increasing/decreasing/flat), first/last/min/max/mean, and the average
    change per period (simple (last - first) / (n - 1)).
    """
    if len(values) < 2:
        return {"error": "Need at least 2 values to determine a trend"}
    total_change = values[-1] - values[0]
    average_change_per_period = total_change / (len(values) - 1)
    if abs(total_change) < 1e-9:
        direction = "flat"
    else:
        direction = "increasing" if total_change > 0 else "decreasing"
    return {
        "direction": direction,
        "first": values[0],
        "last": values[-1],
        "min": min(values),
        "max": max(values),
        "mean": round(statistics.mean(values), 4),
        "total_change": round(total_change, 4),
        "average_change_per_period": round(average_change_per_period, 4),
        "num_periods": len(values),
    }


def calculate_summary_stats(values: list[float]) -> dict:
    """Mean, median, min, max, standard deviation, and count for a list of
    numbers, e.g. to summarise a segment's loss ratios across all regions.
    """
    if not values:
        return {"error": "Need at least 1 value"}
    return {
        "count": len(values),
        "mean": round(statistics.mean(values), 4),
        "median": round(statistics.median(values), 4),
        "min": min(values),
        "max": max(values),
        "stdev": round(statistics.stdev(values), 4) if len(values) > 1 else 0.0,
    }
