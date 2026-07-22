import json
import os
import shutil

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings

from paths import CHROMA_DIR, DATA_DIR, ROOT, STORE_DIR

load_dotenv(ROOT / ".env")

COLLECTION_NAME = "unstructured_sources"
EMBEDDING_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def load_json(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text())


def market_intelligence_documents() -> list[Document]:
    index = {r["id"]: r for r in load_json("unstructured_market_intelligence.json")["records"]}
    docs = []
    for md_path in sorted((DATA_DIR / "unstructured_market_intelligence").glob("MI-*.md")):
        doc_id = md_path.stem.split("_", 1)[0]
        meta = index[doc_id]
        docs.append(
            Document(
                page_content=md_path.read_text(),
                metadata={
                    "source": "market_intelligence",
                    "id": doc_id,
                    "title": meta["title"],
                    "date": meta["date"],
                    "type": meta["type"],
                    "sentiment": meta["sentiment"],
                },
            )
        )
    return docs


def customer_feedback_documents() -> list[Document]:
    comments = load_json("customer_feedback.json")["verbatim_comments"]
    return [
        Document(
            page_content=c["comment"],
            metadata={
                "source": "customer_feedback",
                "id": c["comment_id"],
                "date": c["date"],
                "channel": c["channel"],
                "rating_out_of_5": c["rating_out_of_5"],
            },
        )
        for c in comments
    ]


def pricing_action_documents() -> list[Document]:
    actions = load_json("previous_pricing_actions.json")["records"]
    return [
        Document(
            page_content=a["rationale"],
            metadata={
                "source": "previous_pricing_actions",
                "id": a["action_id"],
                "date": a["date"],
                "segment_affected": a["segment_affected"],
                "action_type": a["action_type"],
            },
        )
        for a in actions
    ]


def build() -> None:
    if CHROMA_DIR.exists():
        shutil.rmtree(CHROMA_DIR)
    STORE_DIR.mkdir(exist_ok=True)

    documents = market_intelligence_documents() + customer_feedback_documents() + pricing_action_documents()

    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    store.add_documents(documents)

    verify(store, documents)
    print(f"\nBuilt {CHROMA_DIR.relative_to(ROOT)} ({len(documents)} chunks)")


def verify(store: Chroma, documents: list[Document]) -> None:
    counts = {}
    for doc in documents:
        counts[doc.metadata["source"]] = counts.get(doc.metadata["source"], 0) + 1

    print("Verification:")
    print(f"  total chunks embedded: {len(documents)} (expected 38)")
    for source, count in counts.items():
        print(f"  {source}: {count}")
    if len(documents) != 38:
        raise AssertionError(f"Expected 38 total chunks, got {len(documents)}")

    hits = store.similarity_search("competitor cutting prices for young drivers", k=3)
    print("\nSmoke test - query: 'competitor cutting prices for young drivers'")
    for hit in hits:
        print(f"  [{hit.metadata['source']}/{hit.metadata['id']}] {hit.page_content[:80]!r}")


if __name__ == "__main__":
    build()
