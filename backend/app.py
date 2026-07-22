"""FastAPI backend microservice - runs the LangGraph orchestrator agent and
streams its progress to the frontend over Server-Sent Events.

Run with: uv run uvicorn app:app --app-dir backend --port 8000
"""

import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agent import stream_query

app = FastAPI(title="Pricing Analyst Copilot Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    async def event_stream():
        async for event in stream_query(request.question):
            yield {"event": event["type"], "data": json.dumps(event)}

    # sep="\n" keeps frames terminated with a plain blank line, matching the
    # simple split("\n\n") parser on the frontend (sse-starlette's default
    # "\r\n" separator would never match that split).
    return EventSourceResponse(event_stream(), sep="\n")
