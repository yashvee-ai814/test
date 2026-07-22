"""Direct file-read tool: full raw text for a single market intelligence
document, for drill-down after a structured filter or semantic search hit.
"""

import re

from paths import DATA_DIR

_MI_DIR = DATA_DIR / "unstructured_market_intelligence"
_ID_PATTERN = re.compile(r"^MI-\d{3}$")


def get_market_intelligence_doc(id: str) -> dict:
    """Full raw markdown text of one market intelligence item (news article,
    regulatory bulletin, analyst report, or social post), by its id
    (e.g. "MI-004"). Use list_market_intelligence or
    search_unstructured_sources first to find the right id - this tool
    returns one full document, not a list.
    """
    if not _ID_PATTERN.match(id):
        return {"error": f"Invalid id {id!r} - expected format like \"MI-004\""}
    matches = list(_MI_DIR.glob(f"{id}_*.md"))
    if not matches:
        return {"error": f"No market intelligence document found for id {id!r}"}
    return {"id": id, "content": matches[0].read_text()}
