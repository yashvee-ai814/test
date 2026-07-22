from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.prebuilt import create_react_agent
from ollama import ResponseError

from llm import get_llm
from mcp_client import get_mcp_tools
from schema import PricingAnalysis
from skill_loader import build_system_prompt

MAX_TURN_ATTEMPTS = 3

TOOL_CATEGORIES = {
    "get_competitor_information": "json",
    "get_previous_pricing_actions": "json",
    "get_customer_feedback_metrics": "json",
    "list_market_intelligence": "json",
    "get_market_intelligence_doc": "file",
    "get_claims_performance": "sql",
    "get_regional_weather_claims": "sql",
    "get_conversion_performance": "sql",
    "search_unstructured_sources": "vector",
    "calculate_percentage_change": "math",
    "calculate_trend": "math",
    "calculate_summary_stats": "math",
}

_output_parser = PydanticOutputParser(pydantic_object=PricingAnalysis)
_agent = None


async def build_agent():
    global _agent
    if _agent is None:
        tools = await get_mcp_tools()
        system_prompt = build_system_prompt() + "\n\n---\n\n" + _output_parser.get_format_instructions()
        _agent = create_react_agent(get_llm(), tools, prompt=system_prompt)
    return _agent


def _parse_final_answer(content: str) -> dict[str, Any]:
    try:
        return _output_parser.parse(content).model_dump()
    except Exception:
        return {
            "summary": [],
            "trends": [],
            "investigation_areas": [],
            "recommendation": content,
            "reasoning": "",
        }


async def stream_query(question: str) -> AsyncIterator[dict[str, Any]]:
    agent = await build_agent()
    inputs = {"messages": [HumanMessage(content=question)]}

    for attempt in range(1, MAX_TURN_ATTEMPTS + 1):
        try:
            async for update in agent.astream(inputs, stream_mode="updates"):
                for node_output in update.values():
                    for message in node_output.get("messages", []):
                        if isinstance(message, AIMessage) and message.tool_calls:
                            for call in message.tool_calls:
                                yield {
                                    "type": "tool_call",
                                    "id": call["id"],
                                    "tool": call["name"],
                                    "category": TOOL_CATEGORIES.get(call["name"], "other"),
                                    "args": call["args"],
                                }
                        elif isinstance(message, ToolMessage):
                            yield {
                                "type": "tool_result",
                                "id": message.tool_call_id,
                                "tool": message.name,
                                "category": TOOL_CATEGORIES.get(message.name, "other"),
                                "result": message.content,
                            }
                        elif isinstance(message, AIMessage) and message.content:
                            yield {"type": "final_answer", **_parse_final_answer(message.content)}
            return
        except ResponseError as e:
            if attempt == MAX_TURN_ATTEMPTS or e.status_code < 500:
                yield {"type": "error", "message": str(e)}
                return
            yield {"type": "retry", "attempt": attempt, "message": str(e)}
