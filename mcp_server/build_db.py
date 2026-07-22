"""One-off loader: JSON -> SQLite for the two genuinely relational data sources
(claims_performance + regional_weather_claims + conversion_performance).

Run with: uv run mcp_server/build_db.py

Per CLAUDE.md's ground rules, this does NOT just trust the load — it re-verifies
row counts and the claims/conversion segment-name cross-reference after writing,
so a bad load fails loudly instead of silently producing a smaller MCP tool
surface than the source data.
"""

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
STORE_DIR = ROOT / "store"
DB_PATH = STORE_DIR / "pricing_copilot.db"

SCHEMA = """
CREATE TABLE claims_performance (
    period TEXT NOT NULL,
    product_line TEXT NOT NULL,
    segment TEXT NOT NULL,
    region TEXT NOT NULL,
    policies_in_force INTEGER NOT NULL,
    earned_premium_gbp INTEGER NOT NULL,
    incurred_claims_gbp INTEGER NOT NULL,
    claim_count INTEGER NOT NULL,
    claim_frequency_pct REAL NOT NULL,
    average_claim_severity_gbp INTEGER NOT NULL,
    loss_ratio_pct REAL NOT NULL
);

CREATE TABLE regional_weather_claims (
    period TEXT NOT NULL,
    region TEXT NOT NULL,
    weather_related_claim_count INTEGER NOT NULL
);

CREATE TABLE conversion_performance (
    period TEXT NOT NULL,
    channel TEXT NOT NULL,
    segment TEXT NOT NULL,
    quotes_count INTEGER NOT NULL,
    conversions_count INTEGER NOT NULL,
    conversion_rate_pct REAL NOT NULL,
    average_quoted_premium_gbp INTEGER NOT NULL,
    average_bound_premium_gbp INTEGER NOT NULL,
    average_pcw_rank REAL
);

CREATE INDEX idx_claims_segment ON claims_performance(segment);
CREATE INDEX idx_claims_period ON claims_performance(period);
CREATE INDEX idx_conversion_segment ON conversion_performance(segment);
CREATE INDEX idx_conversion_period ON conversion_performance(period);
"""


def load_json(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text())


def build() -> None:
    STORE_DIR.mkdir(exist_ok=True)
    DB_PATH.unlink(missing_ok=True)

    claims = load_json("claims_performance.json")
    conversion = load_json("conversion_performance.json")

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)

    conn.executemany(
        """INSERT INTO claims_performance
           (period, product_line, segment, region, policies_in_force, earned_premium_gbp,
            incurred_claims_gbp, claim_count, claim_frequency_pct, average_claim_severity_gbp,
            loss_ratio_pct)
           VALUES (:period, :product_line, :segment, :region, :policies_in_force,
                   :earned_premium_gbp, :incurred_claims_gbp, :claim_count,
                   :claim_frequency_pct, :average_claim_severity_gbp, :loss_ratio_pct)""",
        claims["records"],
    )
    conn.executemany(
        """INSERT INTO regional_weather_claims (period, region, weather_related_claim_count)
           VALUES (:period, :region, :weather_related_claim_count)""",
        claims["regional_weather_claims"],
    )
    conn.executemany(
        """INSERT INTO conversion_performance
           (period, channel, segment, quotes_count, conversions_count, conversion_rate_pct,
            average_quoted_premium_gbp, average_bound_premium_gbp, average_pcw_rank)
           VALUES (:period, :channel, :segment, :quotes_count, :conversions_count,
                   :conversion_rate_pct, :average_quoted_premium_gbp, :average_bound_premium_gbp,
                   :average_pcw_rank)""",
        conversion["records"],
    )
    conn.commit()

    verify(conn, claims, conversion)
    conn.close()
    print(f"\nBuilt {DB_PATH.relative_to(ROOT)}")


def verify(conn: sqlite3.Connection, claims: dict, conversion: dict) -> None:
    checks = []

    n_claims = conn.execute("SELECT COUNT(*) FROM claims_performance").fetchone()[0]
    checks.append(("claims row count", n_claims, len(claims["records"])))

    n_regional = conn.execute("SELECT COUNT(*) FROM regional_weather_claims").fetchone()[0]
    checks.append(("regional_weather row count", n_regional, len(claims["regional_weather_claims"])))

    n_conversion = conn.execute("SELECT COUNT(*) FROM conversion_performance").fetchone()[0]
    checks.append(("conversion row count", n_conversion, len(conversion["records"])))

    claims_segments = {r["segment"] for r in claims["records"]}
    conversion_segments = {r["segment"] for r in conversion["records"]}
    db_claims_segments = {r[0] for r in conn.execute("SELECT DISTINCT segment FROM claims_performance")}
    db_conversion_segments = {r[0] for r in conn.execute("SELECT DISTINCT segment FROM conversion_performance")}

    print("Verification:")
    for label, actual, expected in checks:
        status = "OK" if actual == expected else "FAIL"
        print(f"  [{status}] {label}: {actual} (expected {expected})")
        if actual != expected:
            raise AssertionError(f"{label} mismatch: got {actual}, expected {expected}")

    same_source = claims_segments == conversion_segments
    same_db = db_claims_segments == db_conversion_segments == claims_segments
    print(f"  [{'OK' if same_source and same_db else 'FAIL'}] segment names identical across "
          f"source JSON and both DB tables: {sorted(claims_segments)}")
    if not (same_source and same_db):
        raise AssertionError(
            f"Segment name mismatch.\n  claims JSON: {sorted(claims_segments)}\n"
            f"  conversion JSON: {sorted(conversion_segments)}\n"
            f"  claims DB: {sorted(db_claims_segments)}\n"
            f"  conversion DB: {sorted(db_conversion_segments)}"
        )


if __name__ == "__main__":
    build()
