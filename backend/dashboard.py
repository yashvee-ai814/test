import os
import statistics
from collections import defaultdict

from fastmcp import Client

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "http://127.0.0.1:8001/mcp")

SEGMENTS = ("Young Driver (17-25)", "Standard (26-45)", "Experienced (46-65)", "Senior (66+)")
CHANNELS = ("Price Comparison Website", "Direct (Aviva.co.uk)", "Broker")
DEFAULT_PROFILE = "RP-01"


async def _call(tool_name: str, **kwargs) -> dict:
    async with Client(MCP_SERVER_URL) as client:
        result = await client.call_tool(tool_name, kwargs)
        return result.data


def _claims_trend(records: list[dict]) -> dict:
    by_segment: dict[str, dict[str, float]] = defaultdict(dict)
    for r in records:
        by_segment[r["segment"]][r["period"]] = r["loss_ratio_pct"]
    periods = sorted({r["period"] for r in records})
    return {
        "periods": periods,
        "series": [
            {"label": segment, "values": [by_segment[segment].get(p) for p in periods]}
            for segment in SEGMENTS
            if segment in by_segment
        ],
    }


def _conversion_trend(records: list[dict]) -> dict:
    by_channel_period: dict[tuple[str, str], list[float]] = defaultdict(list)
    for r in records:
        by_channel_period[(r["channel"], r["period"])].append(r["conversion_rate_pct"])
    periods = sorted({r["period"] for r in records})
    return {
        "periods": periods,
        "series": [
            {
                "label": channel,
                "values": [
                    round(statistics.mean(by_channel_period[(channel, p)]), 2)
                    if by_channel_period.get((channel, p))
                    else None
                    for p in periods
                ],
            }
            for channel in CHANNELS
        ],
    }


def _competitor_snapshot(records: list[dict], profile_id: str = DEFAULT_PROFILE) -> dict:
    profile_records = [r for r in records if r["profile_id"] == profile_id]
    latest = max(profile_records, key=lambda r: r["quarter"])
    premiums = sorted(
        ({"label": name, "value": value} for name, value in latest["premiums_gbp"].items()),
        key=lambda p: p["value"],
    )
    return {
        "quarter": latest["quarter"],
        "profile_id": profile_id,
        "profile_description": latest["profile_description"],
        "premiums": premiums,
        "aviva_market_rank": latest["aviva_market_rank"],
        "aviva_vs_market_median_pct": latest["aviva_vs_market_median_pct"],
    }


def _feedback_trend(records: list[dict]) -> dict:
    periods = sorted(r["period"] for r in records)
    by_period = {r["period"]: r for r in records}
    return {
        "periods": periods,
        "nps": [by_period[p]["nps_score"] for p in periods],
        "csat": [by_period[p]["csat_pct"] for p in periods],
    }


def _sentiment_breakdown(records: list[dict]) -> list[dict]:
    counts: dict[str, int] = defaultdict(int)
    for r in records:
        counts[r["sentiment"]] += 1
    order = ["positive", "neutral", "negative"]
    return [{"label": s, "value": counts[s]} for s in order if s in counts] + [
        {"label": s, "value": c} for s, c in counts.items() if s not in order
    ]


async def get_dashboard_data() -> dict:
    claims = (await _call("get_claims_performance"))["records"]
    conversion = (await _call("get_conversion_performance"))["records"]
    competitors = (await _call("get_competitor_information"))["records"]
    feedback = (await _call("get_customer_feedback_metrics"))["records"]
    pricing_actions = (await _call("get_previous_pricing_actions"))["records"]
    market_intel = (await _call("list_market_intelligence"))["records"]

    claims_trend = _claims_trend(claims)
    feedback_trend = _feedback_trend(feedback)

    young_driver_loss_ratios = next(
        (s["values"] for s in claims_trend["series"] if s["label"] == "Young Driver (17-25)"), []
    )
    latest_period = max(r["period"] for r in claims)
    total_policies_latest = sum(r["policies_in_force"] for r in claims if r["period"] == latest_period)

    return {
        "stats": {
            "avg_loss_ratio_young_driver_pct": round(statistics.mean(young_driver_loss_ratios), 1),
            "latest_nps": feedback_trend["nps"][-1],
            "total_policies_in_force": total_policies_latest,
            "pricing_actions_logged": len(pricing_actions),
        },
        "claims_trend": claims_trend,
        "conversion_trend": _conversion_trend(conversion),
        "competitor_snapshot": _competitor_snapshot(competitors),
        "feedback_trend": feedback_trend,
        "market_intelligence_sentiment": _sentiment_breakdown(market_intel),
        "pricing_actions": [
            {
                "action_id": r["action_id"],
                "date": r["date"],
                "segment_affected": r["segment_affected"],
                "action_type": r["action_type"],
                "change_pct": r["change_pct"],
                "rationale": r["rationale"],
            }
            for r in sorted(pricing_actions, key=lambda r: r["date"], reverse=True)
        ],
    }
