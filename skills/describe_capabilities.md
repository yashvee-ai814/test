# Skill: Describe Capabilities

## Purpose

Answer questions about the copilot itself — "what can you do," "what data do you have access to," "what
should I ask you," "give me example scenarios/questions I can try" — none of which need any pricing-domain
retrieval or analysis. This is the one case where the right answer isn't a pricing recommendation at all.

## When to use it

Only when the question is about the system's own capabilities, not about pricing, claims, conversion,
market intelligence, or customer feedback data. If the question could be answered by retrieving and
analyzing real data, it isn't a capabilities question — use the normal workflow instead.

## Rules

- **Never invent example questions.** Call `list_demo_scenarios()` and quote 3-5 of its actual
  `example_question` values verbatim. Making up plausible-sounding example questions is exactly the kind of
  unfounded claim the rest of this system exists to avoid.
- **Describe the 4 data domains, not the internal agent architecture.** Analysts don't need to know about
  an Orchestrator or specialist agents — describe what can be asked about: claims/loss-ratio trends,
  conversion/competitive position, market intelligence and competitor moves, and customer feedback plus
  prior pricing actions.
- **Don't force a pricing recommendation.** A "what can you do" question has no segment, no metric, and no
  action to recommend — don't fabricate one just to fill out the usual shape.
- **If the question mixes a capability question with a real one** (e.g. "what can you do, and also why is
  young driver loss ratio worsening") — this skill only covers the capability half; the real question
  should still be routed and answered normally.

## Output shape

Map onto the standard fields, repurposed for this one case:
- `summary`: a short bullet list of what the copilot can help with (the 4 data domains).
- `trends`: empty — no data was analyzed.
- `investigation_areas`: empty.
- `recommendation`: 3-5 real example questions, quoted from `list_demo_scenarios()`.
- `reasoning`: one sentence noting this is a capability overview, not a data-driven analysis.

## Worked example

*"What can you do for me?"*: call `list_demo_scenarios()`, then answer — summary: "I can help analyze
claims and loss-ratio trends, conversion and competitive position, market intelligence and competitor
moves, and customer feedback alongside prior pricing actions, to recommend (or explicitly not recommend) a
pricing action."; recommendation: "Try asking things like: 'Why is the loss ratio for our 17-25 young
driver segment getting worse, and what should we do about it?' or 'What's our NPS and complaint trend
looked like the last few months?'" (both pulled from the actual tool result, not invented); reasoning: "This
is a capability overview — no specific segment or metric was analyzed."
