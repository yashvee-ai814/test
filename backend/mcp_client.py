import os

from langchain_mcp_adapters.client import MultiServerMCPClient

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "http://127.0.0.1:8001/mcp")


async def get_mcp_tools():
    client = MultiServerMCPClient(
        {
            "pricing_analyst_copilot": {
                "transport": "streamable_http",
                "url": MCP_SERVER_URL,
            }
        }
    )
    return await client.get_tools()
