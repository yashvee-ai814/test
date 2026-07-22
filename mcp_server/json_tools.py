import json

from paths import DATA_DIR


def _load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text())


_competitor_records = _load("competitor_information.json")["records"]
_pricing_action_records = _load("previous_pricing_actions.json")["records"]
_feedback_monthly_metrics = _load("customer_feedback.json")["monthly_metrics"]
_mi_index_records = _load("unstructured_market_intelligence.json")["records"]


def get_competitor_information(quarter: str | None = None, profile_id: str | None = None) -> dict:
    """Quarterly premium benchmarking vs 6 named UK competitors across rating
    profiles RP-01..RP-06. Filter by quarter (e.g. "2025-Q3") and/or profile_id.
    """
    results = _competitor_records
    if quarter:
        results = [r for r in results if r["quarter"] == quarter]
    if profile_id:
        results = [r for r in results if r["profile_id"] == profile_id]
    return {"count": len(results), "records": results}


def get_previous_pricing_actions(
    segment_affected: str | None = None,
    product_line: str | None = None,
    action_type: str | None = None,
    since: str | None = None,
) -> dict:
    """Historical pricing/underwriting actions with logged 3-month impact.
    since filters to action_id records with date >= since (format YYYY-MM-DD).
    segment_affected must be an exact match on one of: "Young Driver (17-25)",
    "Standard (26-45)", "Experienced (46-65)", "Senior (66+)". action_type is
    free text (e.g. "Rate increase", "Underwriting criteria change") - check a
    result's exact wording before filtering on it a second time. For free-text
    questions about *why* an action was taken, prefer
    search_unstructured_sources(source="previous_pricing_actions") instead -
    this tool only filters on the structured fields.
    """
    results = _pricing_action_records
    if segment_affected:
        results = [r for r in results if r["segment_affected"] == segment_affected]
    if product_line:
        results = [r for r in results if r["product_line"] == product_line]
    if action_type:
        results = [r for r in results if r["action_type"] == action_type]
    if since:
        results = [r for r in results if r["date"] >= since]
    return {"count": len(results), "records": results}


def get_customer_feedback_metrics(period_from: str | None = None, period_to: str | None = None) -> dict:
    """Monthly NPS/CSAT/complaint-volume metrics (period format YYYY-MM).
    For what customers actually said, use
    search_unstructured_sources(source="customer_feedback") instead - this
    tool only covers the aggregate monthly numbers.
    """
    results = _feedback_monthly_metrics
    if period_from:
        results = [r for r in results if r["period"] >= period_from]
    if period_to:
        results = [r for r in results if r["period"] <= period_to]
    return {"count": len(results), "records": results}


def list_market_intelligence(
    type: str | None = None,
    sentiment: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    tag: str | None = None,
) -> dict:
    """Structured index of the 18 market intelligence items (id/date/source/
    type/sentiment/tags/title + a one-line summary). Use this for filter-style
    questions ("all negative-sentiment items this quarter"). For semantic
    questions ("what's being said about X") use
    search_unstructured_sources(source="market_intelligence") instead, and use
    get_market_intelligence_doc(id) to read an item's full text.
    """
    results = _mi_index_records
    if type:
        results = [r for r in results if r["type"] == type]
    if sentiment:
        results = [r for r in results if r["sentiment"] == sentiment]
    if date_from:
        results = [r for r in results if r["date"] >= date_from]
    if date_to:
        results = [r for r in results if r["date"] <= date_to]
    if tag:
        results = [r for r in results if tag in r["relevance_tags"]]
    return {"count": len(results), "records": results}
