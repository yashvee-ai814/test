import sqlite3

from paths import DB_PATH


def _query(sql: str, params: dict) -> list[dict]:
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def _filtered_query(
    table: str, equals: dict[str, str | None], period_from: str | None, period_to: str | None
) -> list[dict]:
    sql = f"SELECT * FROM {table} WHERE 1=1"
    params: dict = {}
    for column, value in equals.items():
        if value:
            sql += f" AND {column} = :{column}"
            params[column] = value
    if period_from:
        sql += " AND period >= :period_from"
        params["period_from"] = period_from
    if period_to:
        sql += " AND period <= :period_to"
        params["period_to"] = period_to
    sql += " ORDER BY period"
    results = _query(sql, params)
    return results


def get_claims_performance(
    segment: str | None = None,
    product_line: str | None = None,
    period_from: str | None = None,
    period_to: str | None = None,
) -> dict:
    """Monthly claims performance by segment: frequency, severity, loss ratio,
    earned premium. Data covers 2025-07 to 2026-06 (period format YYYY-MM).
    segment must be an exact match on one of: "Young Driver (17-25)",
    "Standard (26-45)", "Experienced (46-65)", "Senior (66+)". product_line is
    always "Private Car Motor - Comprehensive" - omit it unless you actually
    need to filter (there is only one value). Note: the per-record `region`
    field is a rotating label, NOT a real per-region breakdown - use
    get_regional_weather_claims for genuine regional analysis.
    """
    results = _filtered_query(
        "claims_performance", {"segment": segment, "product_line": product_line}, period_from, period_to
    )
    return {"count": len(results), "records": results}


def get_regional_weather_claims(
    region: str | None = None,
    period_from: str | None = None,
    period_to: str | None = None,
) -> dict:
    """Weather-related claim counts by region and month (2025-07 to 2026-06) -
    this is the real regional axis for claims (unlike the `region` field on
    get_claims_performance records). region must be an exact match on one of:
    "London & South East", "Midlands", "North of England", "Scotland & NI",
    "Wales & South West".
    """
    results = _filtered_query("regional_weather_claims", {"region": region}, period_from, period_to)
    return {"count": len(results), "records": results}


def get_conversion_performance(
    segment: str | None = None,
    channel: str | None = None,
    period_from: str | None = None,
    period_to: str | None = None,
) -> dict:
    """Quote-to-bind conversion by channel and segment. Data covers 2025-07 to
    2026-06 (period format YYYY-MM). channel must be an exact match on one of:
    "Price Comparison Website", "Direct (Aviva.co.uk)", "Broker". segment must
    be an exact match on one of: "Young Driver (17-25)", "Standard (26-45)",
    "Experienced (46-65)", "Senior (66+)". average_pcw_rank is only populated
    for the Price Comparison Website channel - it will be null for
    Direct/Broker rows.
    """
    results = _filtered_query(
        "conversion_performance", {"segment": segment, "channel": channel}, period_from, period_to
    )
    return {"count": len(results), "records": results}
