import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agent import stream_query
from dashboard import get_dashboard_data

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


@app.get("/dashboard")
async def dashboard():
    return await get_dashboard_data()


@app.post("/chat")
async def chat(request: ChatRequest):
    async def event_stream():
        async for event in stream_query(request.question):
            yield {"event": event["type"], "data": json.dumps(event)}

    return EventSourceResponse(event_stream(), sep="\n")
