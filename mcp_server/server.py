import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastmcp import FastMCP

from file_tools import get_market_intelligence_doc
from json_tools import (
    get_competitor_information,
    get_customer_feedback_metrics,
    get_previous_pricing_actions,
    list_market_intelligence,
)
from math_tools import calculate_percentage_change, calculate_summary_stats, calculate_trend
from sql_tools import get_claims_performance, get_conversion_performance, get_regional_weather_claims
from vector_tools import search_unstructured_sources

mcp = FastMCP("pricing-analyst-copilot")

for fn in (
    get_competitor_information,
    get_previous_pricing_actions,
    get_customer_feedback_metrics,
    list_market_intelligence,
    get_market_intelligence_doc,
    get_claims_performance,
    get_regional_weather_claims,
    get_conversion_performance,
    search_unstructured_sources,
    calculate_percentage_change,
    calculate_trend,
    calculate_summary_stats,
):
    mcp.tool(fn)

if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host=os.environ.get("MCP_SERVER_HOST", "127.0.0.1"),
        port=int(os.environ.get("MCP_SERVER_PORT", "8001")),
    )
