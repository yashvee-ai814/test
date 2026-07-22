"""Reads the skills/*.md files and assembles the agent's system prompt.

For this phase (single orchestrator agent) all 7 skills are concatenated into
one prompt, master orchestrator first since it sets the overall workflow and
tool inventory the other skills assume. Structured as a function (not a
module-level constant) so a future multi-agent split can call it per-agent
with a subset of skill names instead.
"""

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
