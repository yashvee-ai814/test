"""The single orchestrator agent for this phase: a LangGraph ReAct agent bound
to the MCP server's 12 tools, with a system prompt assembled from all 7 skill
files. Exposes an async generator that streams each step (tool calls, tool
results, final answer) so the FastAPI layer can forward them to the frontend
as they happen rather than waiting for the whole run to finish.
"""

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

# gpt-oss:120b-cloud (Ollama's hosted proxy) occasionally 500s on longer,
# tool-heavy conversations. There's no per-call retry hook that survives
# create_react_agent's bind_tools(), so retry the whole turn from scratch.
MAX_TURN_ATTEMPTS = 3

# Lets the frontend group/color-code the trace by retrieval technique without
# the MCP server needing to expose its own module layout as tool metadata -
# these are just the 12 tool names from mcp_server/server.py, categorized.
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

# create_react_agent's built-in response_format (a separate structured-output
# model call after the ReAct loop) proved unreliable against gpt-oss:120b-cloud:
# its default "json_schema" method returned an empty response, and
# "function_calling" with a forced tool_choice returned no tool call either.
# Both are Ollama-cloud-specific quirks in a code path this project doesn't
# otherwise exercise. Instead, the final free-text turn - the same mechanism
# already proven reliable for tool-calling and plain answers all session - is
# asked to emit JSON matching PricingAnalysis, parsed client-side with a
# graceful fallback rather than a forced/validated model call.
_output_parser = PydanticOutputParser(pydantic_object=PricingAnalysis)

# Built once per process: the MCP tool list is static for the server's
# lifetime, so there's no need to re-fetch it and reconstruct the graph on
# every request.
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
        # Model didn't follow the JSON format instructions - surface its raw
        # answer as the recommendation rather than losing the response.
        return {
            "summary": [],
            "trends": [],
            "investigation_areas": [],
            "recommendation": content,
            "reasoning": "",
        }


async def stream_query(question: str) -> AsyncIterator[dict[str, Any]]:
    """Yields step events: {"type": "tool_call" | "tool_result" | "final_answer"
    | "retry" | "error", ...}. tool_call/tool_result events carry a
    "category" (json/file/sql/vector/math) for grouping in the UI. The
    final_answer event carries the structured PricingAnalysis fields
    (summary/trends/investigation_areas/recommendation/reasoning) rather than
    one free-text blob, so the frontend can render each as its own card. A
    "retry" event means every event since the last "retry" (or the start of
    the stream) belongs to a failed attempt and should be discarded by the
    consumer before it renders what follows.
    """
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
