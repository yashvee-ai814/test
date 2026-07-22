from typing import Any, Literal, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from langgraph.types import Send
from pydantic import BaseModel

from llm import get_llm
from mcp_client import get_mcp_tools
from schema import PricingAnalysis
from skill_loader import build_system_prompt

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
    "list_demo_scenarios": "json",
}

_output_parser = PydanticOutputParser(pydantic_object=PricingAnalysis)

SPECIALISTS: dict[str, dict[str, Any]] = {
    "market": {
        "skills": ["retrieve_information", "summarise_findings", "highlight_trends"],
        "tools": {"list_market_intelligence", "get_market_intelligence_doc", "search_unstructured_sources"},
    },
    "claims": {
        "skills": ["retrieve_information", "highlight_trends", "identify_investigation_areas"],
        "tools": {"get_claims_performance", "get_regional_weather_claims", "calculate_trend", "calculate_summary_stats"},
    },
    "conversion": {
        "skills": ["retrieve_information", "highlight_trends"],
        "tools": {"get_conversion_performance", "get_competitor_information", "calculate_percentage_change"},
    },
}

RECOMMEND_SKILLS = ["recommend_pricing_actions", "explain_reasoning", "describe_capabilities"]
RECOMMEND_TOOLS = {
    "get_previous_pricing_actions",
    "search_unstructured_sources",
    "get_customer_feedback_metrics",
    "list_demo_scenarios",
}


class GraphState(TypedDict):
    query: str
    routing: list[str]
    market_findings: str | None
    claims_findings: str | None
    conversion_findings: str | None
    final_answer: dict[str, Any] | None


class RoutingDecision(BaseModel):
    agents: list[Literal["market", "claims", "conversion"]]


_routing_parser = PydanticOutputParser(pydantic_object=RoutingDecision)


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


def _scope_tools(tools: list[Any], names: set[str]) -> list[Any]:
    return [t for t in tools if t.name in names]


_specialist_agents: dict[str, Any] = {}


async def _get_specialist_agent(name: str, skill_names: list[str], tool_names: set[str]):
    if name not in _specialist_agents:
        tools = _scope_tools(await get_mcp_tools(), tool_names)
        system_prompt = build_system_prompt(skill_names)
        _specialist_agents[name] = create_react_agent(get_llm(), tools, prompt=system_prompt)
    return _specialist_agents[name]


async def _run_specialist(name: str, skill_names: list[str], tool_names: set[str], query: str) -> str | None:
    agent = await _get_specialist_agent(name, skill_names, tool_names)
    writer = get_stream_writer()
    findings: str | None = None

    async for update in agent.astream({"messages": [HumanMessage(content=query)]}, stream_mode="updates"):
        for node_output in update.values():
            for message in node_output.get("messages", []):
                if isinstance(message, AIMessage) and message.tool_calls:
                    for call in message.tool_calls:
                        writer(
                            {
                                "type": "tool_call",
                                "agent": name,
                                "id": call["id"],
                                "tool": call["name"],
                                "category": TOOL_CATEGORIES.get(call["name"], "other"),
                                "args": call["args"],
                            }
                        )
                elif isinstance(message, ToolMessage):
                    writer(
                        {
                            "type": "tool_result",
                            "agent": name,
                            "id": message.tool_call_id,
                            "tool": message.name,
                            "category": TOOL_CATEGORIES.get(message.name, "other"),
                            "result": message.content,
                        }
                    )
                elif isinstance(message, AIMessage) and message.content:
                    findings = message.content

    return findings


async def market_agent_node(state: GraphState) -> dict[str, Any]:
    spec = SPECIALISTS["market"]
    findings = await _run_specialist("market", spec["skills"], spec["tools"], state["query"])
    return {"market_findings": findings}


async def claims_agent_node(state: GraphState) -> dict[str, Any]:
    spec = SPECIALISTS["claims"]
    findings = await _run_specialist("claims", spec["skills"], spec["tools"], state["query"])
    return {"claims_findings": findings}


async def conversion_agent_node(state: GraphState) -> dict[str, Any]:
    spec = SPECIALISTS["conversion"]
    findings = await _run_specialist("conversion", spec["skills"], spec["tools"], state["query"])
    return {"conversion_findings": findings}


async def orchestrate_node(state: GraphState) -> dict[str, Any]:
    system_prompt = build_system_prompt(["orchestrate_flow"]) + "\n\n---\n\n" + _routing_parser.get_format_instructions()
    try:
        response = await get_llm().ainvoke(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": state["query"]}]
        )
        routing = list(_routing_parser.parse(response.content).agents)
    except Exception:
        routing = list(SPECIALISTS.keys())

    writer = get_stream_writer()
    writer({"type": "routing", "agents": routing})
    return {"routing": routing}


def route_to_specialists(state: GraphState) -> list[Send]:
    if not state["routing"]:
        return [Send("recommend", {"query": state["query"]})]
    return [Send(f"{name}_agent", {"query": state["query"]}) for name in state["routing"]]


async def recommend_node(state: GraphState) -> dict[str, Any]:
    context_blocks = []
    for name in ("market", "claims", "conversion"):
        findings = state.get(f"{name}_findings")
        if findings:
            context_blocks.append(f"{name.capitalize()} findings:\n{findings}")

    context = "\n\n".join(context_blocks) if context_blocks else "(no specialist findings — answer directly from your own tools)"
    query = (
        f"Analyst question: {state['query']}\n\n"
        f"Specialist findings so far:\n{context}\n\n"
        f"{_output_parser.get_format_instructions()}"
    )

    findings = await _run_specialist("recommend", RECOMMEND_SKILLS, RECOMMEND_TOOLS, query)
    return {"final_answer": _parse_final_answer(findings) if findings else None}


_graph = None


async def build_graph():
    global _graph
    if _graph is None:
        graph = StateGraph(GraphState)
        graph.add_node("orchestrate", orchestrate_node)
        graph.add_node("market_agent", market_agent_node)
        graph.add_node("claims_agent", claims_agent_node)
        graph.add_node("conversion_agent", conversion_agent_node)
        graph.add_node("recommend", recommend_node)

        graph.add_edge(START, "orchestrate")
        graph.add_conditional_edges(
            "orchestrate",
            route_to_specialists,
            ["market_agent", "claims_agent", "conversion_agent", "recommend"],
        )
        graph.add_edge("market_agent", "recommend")
        graph.add_edge("claims_agent", "recommend")
        graph.add_edge("conversion_agent", "recommend")
        graph.add_edge("recommend", END)

        _graph = graph.compile()
    return _graph
