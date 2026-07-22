import os

from langchain_ollama import ChatOllama

DEFAULT_MODEL = "gpt-oss:120b-cloud"


def get_llm() -> ChatOllama:
    return ChatOllama(
        model=os.environ.get("OLLAMA_CHAT_MODEL", DEFAULT_MODEL),
        base_url=os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0,
        reasoning=False,
    )
