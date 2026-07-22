"""Dev/test script: runs the agent directly against the MCP server (which
must already be running) without needing the FastAPI/frontend layers up -
for quick verification of the agent + skills + tools working end to end.

Run with: uv run backend/run_cli.py "why is young driver loss ratio worsening?"
"""

import asyncio
import sys

from agent import stream_query


async def main(question: str) -> None:
    print(f"Q: {question}\n")
    async for event in stream_query(question):
        if event["type"] == "tool_call":
            print(f"  -> [{event['category']}] calling {event['tool']}({event['args']})")
        elif event["type"] == "tool_result":
            preview = str(event["result"])[:200]
            print(f"  <- [{event['category']}] {event['tool']} returned: {preview}")
        elif event["type"] == "final_answer":
            print("\nSummary:")
            for line in event["summary"]:
                print(f"  - {line}")
            print("\nTrends:")
            for line in event["trends"]:
                print(f"  - {line}")
            if event["investigation_areas"]:
                print("\nInvestigation areas:")
                for line in event["investigation_areas"]:
                    print(f"  - {line}")
            print(f"\nRecommendation: {event['recommendation']}")
            print(f"\nReasoning: {event['reasoning']}\n")
        elif event["type"] == "retry":
            print(f"  !! transient error, retrying (attempt {event['attempt']}): {event['message'][:150]}")
        elif event["type"] == "error":
            print(f"  !! failed: {event['message'][:300]}")


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "Why is the loss ratio for our young driver segment getting worse, and what should we do about it?"
    asyncio.run(main(question))
