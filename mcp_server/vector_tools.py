import os
from typing import Literal

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

from paths import CHROMA_DIR

_EMBEDDING_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
_COLLECTION_NAME = "unstructured_sources"

_store = Chroma(
    collection_name=_COLLECTION_NAME,
    embedding_function=OllamaEmbeddings(model=_EMBEDDING_MODEL),
    persist_directory=str(CHROMA_DIR),
)

Source = Literal["market_intelligence", "customer_feedback", "previous_pricing_actions"]


def search_unstructured_sources(query: str, source: Source | None = None, top_k: int = 5) -> dict:
    """Semantic search over free-text content: market intelligence articles,
    customer feedback verbatim comments, and previous pricing action
    rationales. Returns short excerpts and metadata only, not full documents -
    for a market intelligence item's full text, follow up with
    get_market_intelligence_doc(id). Optionally restrict to one source:
    "market_intelligence", "customer_feedback", or "previous_pricing_actions".
    """
    filter_ = {"source": source} if source else None
    hits = _store.similarity_search_with_relevance_scores(query, k=top_k, filter=filter_)
    return {
        "count": len(hits),
        "results": [
            {"score": round(score, 4), "excerpt": doc.page_content[:280], "metadata": doc.metadata}
            for doc, score in hits
        ],
    }
