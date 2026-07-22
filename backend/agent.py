from collections.abc import AsyncIterator
from typing import Any

from ollama import ResponseError

from graph import build_graph

MAX_TURN_ATTEMPTS = 3


async def stream_query(question: str) -> AsyncIterator[dict[str, Any]]:
    graph = await build_graph()
    inputs = {
        "query": question,
        "routing": [],
        "market_findings": None,
        "claims_findings": None,
        "conversion_findings": None,
        "final_answer": None,
    }

    for attempt in range(1, MAX_TURN_ATTEMPTS + 1):
        try:
            async for stream_type, payload in graph.astream(inputs, stream_mode=["updates", "custom"]):
                if stream_type == "custom":
                    yield payload
                else:
                    for node_output in payload.values():
                        final_answer = node_output.get("final_answer")
                        if final_answer:
                            yield {"type": "final_answer", **final_answer}
            return
        except ResponseError as e:
            if attempt == MAX_TURN_ATTEMPTS or e.status_code < 500:
                yield {"type": "error", "message": str(e)}
                return
            yield {"type": "retry", "attempt": attempt, "message": str(e)}
