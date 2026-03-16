import json
import anthropic
from typing import AsyncGenerator
from tool_definitions import BUILDER_TOOLS

# --- Phase 1: Fast discovery (single call, no tools) ---

DISCOVER_PROMPT = """You are a market research expert. Based on your knowledge of Reddit communities and common complaints, identify pain points in the given niche.

For each pain point, include:
- A clear title
- Description of the problem
- Severity (high/medium/low)
- Representative quotes you'd typically see on Reddit (paraphrase common sentiments)
- Relevant subreddits where this is discussed

Then for each pain point, suggest a business idea.

Respond with ONLY valid JSON, no markdown fences:
{{
  "pain_points": [
    {{
      "title": "...",
      "description": "...",
      "severity": "high|medium|low",
      "quotes": ["...", "..."],
      "subreddits": ["..."]
    }}
  ],
  "business_ideas": [
    {{
      "name": "...",
      "description": "...",
      "target_pain_point": "...",
      "estimated_cost": "...",
      "revenue_model": "...",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}"""


async def discover(niche: str, target_pain_points: int) -> AsyncGenerator[dict, None]:
    client = anthropic.AsyncAnthropic()
    yield {"event": "status", "data": json.dumps({"message": f"Analyzing '{niche}'..."})}

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=DISCOVER_PROMPT,
        messages=[{"role": "user", "content": f"Find {target_pain_points} pain points and business ideas for the niche: {niche}"}],
    )

    yield _tokens_event(response)

    text = "".join(b.text for b in response.content if b.type == "text")
    try:
        result = json.loads(text[text.find("{"):text.rfind("}") + 1])
        yield {"event": "result", "data": json.dumps(result)}
    except (json.JSONDecodeError, ValueError):
        yield {"event": "result", "data": json.dumps({"pain_points": [], "business_ideas": [], "error": "Failed to parse"})}


# --- Phase 2: Agentic idea builder ---

BUILDER_PROMPT = """You are a startup strategist building out a business idea. Use ALL FIVE tools:

1. create_business_canvas — Business Model Canvas
2. generate_competitive_analysis — Compare against 3-4 real existing competitors with a feature matrix
3. generate_revenue_model — Realistic financial defaults for a revenue calculator
4. generate_validation_score — Honest 1-10 ratings across 6 dimensions
5. generate_marketing_plan — Launch marketing plan

Be specific, actionable, and realistic. This is for a solo founder or small team.
Use real competitor names where possible. Be honest in validation scores — not everything is a 9/10."""

REFINE_PROMPT = """You are a startup strategist. The user previously built out a business idea and now wants to refine it based on feedback.

You have the same 5 tools available. Only re-call the tools that need updating based on the feedback. You don't need to regenerate everything — just the parts affected by the feedback.

Be specific, actionable, and realistic."""

MAX_TOOL_CALLS = 8

_cancel_flags: dict[str, bool] = {}

TOOL_STATUS = {
    "create_business_canvas": "Creating Business Model Canvas...",
    "generate_competitive_analysis": "Analyzing competitors...",
    "generate_revenue_model": "Building revenue model...",
    "generate_validation_score": "Scoring idea viability...",
    "generate_marketing_plan": "Building marketing plan...",
}


def request_cancel(analysis_id: str):
    _cancel_flags[analysis_id] = True


def _tokens_event(response) -> dict:
    return {
        "event": "tokens",
        "data": json.dumps({
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        })
    }


async def _run_tool_loop(client, system_prompt: str, messages: list, analysis_id: str) -> AsyncGenerator[dict, None]:
    """Shared agentic tool-use loop for build and refine."""
    total_input = 0
    total_output = 0
    tool_calls = 0
    results: dict = {}

    while tool_calls < MAX_TOOL_CALLS:
        if _cancel_flags.get(analysis_id):
            break

        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            system=system_prompt,
            tools=BUILDER_TOOLS,
            messages=messages,
        )

        total_input += response.usage.input_tokens
        total_output += response.usage.output_tokens
        yield {
            "event": "tokens",
            "data": json.dumps({"input_tokens": total_input, "output_tokens": total_output, "total_tokens": total_input + total_output})
        }

        if response.stop_reason == "end_turn":
            break

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                tool_calls += 1
                yield {"event": "status", "data": json.dumps({
                    "message": TOOL_STATUS.get(block.name, f"Running {block.name}..."),
                    "call_number": tool_calls,
                })}
                results[block.name] = block.input
                yield {"event": block.name, "data": json.dumps(block.input)}
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps({"success": True})})

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    yield {"event": "build_complete", "data": json.dumps({
        "canvas": results.get("create_business_canvas"),
        "competitive_analysis": results.get("generate_competitive_analysis"),
        "revenue_model": results.get("generate_revenue_model"),
        "validation_score": results.get("generate_validation_score"),
        "marketing_plan": results.get("generate_marketing_plan"),
        "input_tokens": total_input,
        "output_tokens": total_output,
    })}
    _cancel_flags.pop(analysis_id, None)


async def build_idea(idea_name: str, idea_description: str, target_pain_point: str, niche: str, analysis_id: str) -> AsyncGenerator[dict, None]:
    _cancel_flags[analysis_id] = False
    client = anthropic.AsyncAnthropic()

    messages = [{"role": "user", "content": f"""Build out this business idea:

**Name:** {idea_name}
**Description:** {idea_description}
**Pain point it solves:** {target_pain_point}
**Niche:** {niche}

Use all five tools."""}]

    yield {"event": "status", "data": json.dumps({"message": f"Building out '{idea_name}'..."})}
    async for event in _run_tool_loop(client, BUILDER_PROMPT, messages, analysis_id):
        yield event


async def refine_idea(idea_name: str, idea_description: str, target_pain_point: str, niche: str,
                      feedback: str, current_build: dict, analysis_id: str) -> AsyncGenerator[dict, None]:
    _cancel_flags[analysis_id] = False
    client = anthropic.AsyncAnthropic()

    # Summarize current build so Claude knows what exists
    build_summary = json.dumps({k: v for k, v in current_build.items() if v is not None}, indent=2)

    messages = [{"role": "user", "content": f"""Original idea:
**Name:** {idea_name}
**Description:** {idea_description}
**Pain point:** {target_pain_point}
**Niche:** {niche}

Current build (for context):
{build_summary}

User feedback to incorporate:
"{feedback}"

Re-generate only the parts that need updating based on this feedback. Use the relevant tools."""}]

    yield {"event": "status", "data": json.dumps({"message": f"Refining based on feedback..."})}
    async for event in _run_tool_loop(client, REFINE_PROMPT, messages, analysis_id):
        yield event
