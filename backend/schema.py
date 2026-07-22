from pydantic import BaseModel, Field


class PricingAnalysis(BaseModel):
    summary: list[str] = Field(
        description="Key findings, one per bullet, each traceable to a specific retrieved fact and its source"
    )
    trends: list[str] = Field(
        description="Trend statements, each stating direction and magnitude from a math tool result, not eyeballed"
    )
    investigation_areas: list[str] = Field(
        description="Specific, actionable follow-up questions or verification steps - empty list if none apply"
    )
    recommendation: str = Field(
        description="The specific recommended pricing action, or an explicit statement that no action is recommended"
    )
    reasoning: str = Field(
        description="2-4 sentences explaining why, citing the specific numbers and sources behind the recommendation"
    )
