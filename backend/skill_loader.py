from pathlib import Path

SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"

ALL_SKILLS = [
    "master_orchestrator",
    "retrieve_information",
    "summarise_findings",
    "highlight_trends",
    "identify_investigation_areas",
    "recommend_pricing_actions",
    "explain_reasoning",
]


def build_system_prompt(skill_names: list[str] = ALL_SKILLS) -> str:
    sections = [(SKILLS_DIR / f"{name}.md").read_text() for name in skill_names]
    return "\n\n---\n\n".join(sections)
